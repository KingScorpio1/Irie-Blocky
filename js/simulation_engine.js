// Simulation Engine for IrieBlocky
// Simulates an Arduino Uno MCU and provides electrical bindings to Wokwi elements on the CircuitCanvas.

class SimulationEngine {
  constructor() {
    this.circuitCanvas = null;
    this.running = false;
    this.paused = false;
    this.abortController = null;
    this.signal = null;

    // Timing
    this.startTimeMs = 0;
    this.perfStart = 0;

    // Virtual MCU Pin States
    // Key: pin number (e.g. 13, 2, 'A0', etc.), Value: 0 or 1 (or 0-255 for PWM)
    this.pinStates = new Map();
    this.pinModes = new Map(); // 'INPUT', 'OUTPUT', 'INPUT_PULLUP'

    // Netlist Pin Mapping: maps Uno pin -> Array<{ element, comp, role: 'output'|'input' }>
    this.pinMap = new Map();
    this.servoNameMap = new Map();

    // Web Audio Context for Buzzers / tone()
    this.audioCtx = null;
    this.oscillators = new Map(); // pin -> { osc, gainNode }

    // Serial Monitor State
    this.serialBaud = 9600;
    this.serialBuffer = '';
    this.serialInputQueue = [];
    this.serialCallbacks = [];
    this.stateCallbacks = [];

    // Serial Object exposed to sketch
    const self = this;
    this.Serial = {
      begin: (baud) => {
        self.serialBaud = baud || 9600;
        self._serialWrite(`[Serial] Initialized at ${self.serialBaud} baud\r\n`);
      },
      print: (val) => {
        self._serialWrite(val !== undefined && val !== null ? String(val) : '');
      },
      println: (val) => {
        const text = (val !== undefined && val !== null ? String(val) : '') + '\r\n';
        self._serialWrite(text);
      },
      write: (val) => {
        if (typeof val === 'number') {
          self._serialWrite(String.fromCharCode(val));
        } else {
          self._serialWrite(String(val));
        }
      },
      available: () => self.serialInputQueue.length,
      read: () => (self.serialInputQueue.length > 0 ? self.serialInputQueue.shift() : -1),
      readString: () => {
        const str = self.serialInputQueue.map(c => String.fromCharCode(c)).join('');
        self.serialInputQueue = [];
        return str;
      }
    };
  }

  // Bind to CircuitCanvas instance
  setCircuit(canvas) {
    this.circuitCanvas = canvas;
  }

  // Register callback for Serial output text
  onSerialData(cb) {
    if (typeof cb === 'function') {
      this.serialCallbacks.push(cb);
    }
  }

  // Register callback for simulation state changes (started, stopped, paused)
  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.stateCallbacks.push(cb);
    }
  }

  _notifyState(state) {
    for (const cb of this.stateCallbacks) {
      try { cb(state); } catch (e) { console.error('State callback error:', e); }
    }
  }

  _serialWrite(text) {
    this.serialBuffer += text;
    // Cap buffer length
    if (this.serialBuffer.length > 50000) {
      this.serialBuffer = this.serialBuffer.slice(-30000);
    }
    for (const cb of this.serialCallbacks) {
      try { cb(text); } catch (e) { console.error('Serial callback error:', e); }
    }
    if (window.serialPlotter) {
      window.serialPlotter.addSerialLine(text);
    }
  }

  // Send input into Arduino Serial buffer (from user typing in Serial Monitor)
  sendSerialInput(text) {
    if (!text) return;
    for (let i = 0; i < text.length; i++) {
      this.serialInputQueue.push(text.charCodeAt(i));
    }
  }

  // Clear Serial history
  clearSerial() {
    this.serialBuffer = '';
    this.serialInputQueue = [];
  }

  // ---------------------------------------------------------------------------
  // Netlist Graph Analysis & Pin Mapping
  // ---------------------------------------------------------------------------

  buildPinMap() {
    this.pinMap.clear();
    this.servoNameMap.clear();

    if (!this.circuitCanvas || !this.circuitCanvas.netlist) {
      return;
    }

    const netlist = this.circuitCanvas.netlist;
    const allComps = netlist.getAllComponents();

    // 1. Locate Arduino Uno in components
    const uno = allComps.find(c => c.type === 'wokwi-arduino-uno');
    const unoId = uno ? uno.id : null;

    // 2. Trace each component back to Uno pins
    for (const comp of allComps) {
      if (comp.type === 'wokwi-arduino-uno') continue;

      if (comp.type === 'wokwi-led') {
        // Trace Anode (A) through any resistor to Uno pin
        const anodeTarget = netlist.findConnectedUnoPin(comp.id, 'A');
        if (anodeTarget && anodeTarget.pin) {
          this._registerPinBinding(anodeTarget.pin, comp, 'output');
        } else {
          // If no anode wire found, also check cathode
          const cathodeTarget = netlist.findConnectedUnoPin(comp.id, 'C');
          if (cathodeTarget && cathodeTarget.pin && !cathodeTarget.pin.startsWith('GND')) {
            this._registerPinBinding(cathodeTarget.pin, comp, 'output');
          }
        }
      } else if (comp.type === 'wokwi-servo') {
        // Trace PWM pin to Uno
        const pwmTarget = netlist.findConnectedUnoPin(comp.id, 'PWM');
        if (pwmTarget && pwmTarget.pin) {
          this._registerPinBinding(pwmTarget.pin, comp, 'output');
        }
        // Also register in servoNameMap (by comp.id or default 'myServo')
        this.servoNameMap.set(comp.id, comp);
        this.servoNameMap.set('myServo', comp);
      } else if (comp.type === 'wokwi-buzzer') {
        // Trace pin 1 or 2 to Uno
        const p1 = netlist.findConnectedUnoPin(comp.id, '1');
        const p2 = netlist.findConnectedUnoPin(comp.id, '2');
        const target = (p1 && !p1.pin.startsWith('GND')) ? p1 : p2;
        if (target && target.pin) {
          this._registerPinBinding(target.pin, comp, 'output');
        }
      } else if (comp.type === 'wokwi-pushbutton') {
        // Trace pins to Uno digital input
        const pins = ['1.l', '2.l', '1.r', '2.r'];
        for (const p of pins) {
          const target = netlist.findConnectedUnoPin(comp.id, p);
          if (target && target.pin && !target.pin.startsWith('GND') && !target.pin.startsWith('5V')) {
            this._registerPinBinding(target.pin, comp, 'input');
            break;
          }
        }
        // Attach click/press listener for interactive simulation
        this._setupButtonInteractivity(comp);
      } else if (comp.type === 'wokwi-potentiometer') {
        // Trace SIG pin to Uno analog pin
        const sigTarget = netlist.findConnectedUnoPin(comp.id, 'SIG');
        if (sigTarget && sigTarget.pin) {
          this._registerPinBinding(sigTarget.pin, comp, 'input');
        }
        this._setupPotentiometerInteractivity(comp);
      } else if (comp.type === 'wokwi-hc-sr04') {
        // Trace Trig and Echo to Uno
        const trig = netlist.findConnectedUnoPin(comp.id, 'TRIG');
        const echo = netlist.findConnectedUnoPin(comp.id, 'ECHO');
        if (trig && trig.pin) this._registerPinBinding(trig.pin, comp, 'input');
        if (echo && echo.pin) this._registerPinBinding(echo.pin, comp, 'input');
      } else if (comp.type === 'wokwi-dht22') {
        // Trace SDA (Data pin) to Uno
        const sda = netlist.findConnectedUnoPin(comp.id, 'SDA');
        if (sda && sda.pin) this._registerPinBinding(sda.pin, comp, 'input');
      } else if (comp.type === 'wokwi-pir-motion-sensor') {
        // Trace OUT to Uno
        const out = netlist.findConnectedUnoPin(comp.id, 'OUT');
        if (out && out.pin) this._registerPinBinding(out.pin, comp, 'input');
        this._setupPirInteractivity(comp);
      } else if (comp.type === 'wokwi-photoresistor-sensor') {
        // Trace AO or DO to Uno
        const ao = netlist.findConnectedUnoPin(comp.id, 'AO');
        const doPin = netlist.findConnectedUnoPin(comp.id, 'DO');
        if (ao && ao.pin) this._registerPinBinding(ao.pin, comp, 'input');
        if (doPin && doPin.pin) this._registerPinBinding(doPin.pin, comp, 'input');
      } else if (comp.type === 'wokwi-gas-sensor') {
        // Trace AOUT or DOUT to Uno
        const ao = netlist.findConnectedUnoPin(comp.id, 'AOUT');
        const doPin = netlist.findConnectedUnoPin(comp.id, 'DOUT');
        if (ao && ao.pin) this._registerPinBinding(ao.pin, comp, 'input');
        if (doPin && doPin.pin) this._registerPinBinding(doPin.pin, comp, 'input');
      } else if (comp.type === 'wokwi-ntc-temperature-sensor') {
        // Trace OUT to Uno analog pin
        const out = netlist.findConnectedUnoPin(comp.id, 'OUT');
        if (out && out.pin) this._registerPinBinding(out.pin, comp, 'input');
      } else if (comp.type === 'wokwi-hx711') {
        // Trace DT and SCK to Uno
        const dt = netlist.findConnectedUnoPin(comp.id, 'DT');
        const sck = netlist.findConnectedUnoPin(comp.id, 'SCK');
        if (dt && dt.pin) this._registerPinBinding(dt.pin, comp, 'input');
        if (sck && sck.pin) this._registerPinBinding(sck.pin, comp, 'input');
      } else if (comp.type === 'wokwi-analog-joystick') {
        const vert = netlist.findConnectedUnoPin(comp.id, 'VERT');
        const horz = netlist.findConnectedUnoPin(comp.id, 'HORZ');
        const sel = netlist.findConnectedUnoPin(comp.id, 'SEL');
        if (vert && vert.pin) this._registerPinBinding(vert.pin, comp, 'input');
        if (horz && horz.pin) this._registerPinBinding(horz.pin, comp, 'input');
        if (sel && sel.pin) this._registerPinBinding(sel.pin, comp, 'input');
      } else if (comp.type === 'wokwi-slide-switch') {
        const com = netlist.findConnectedUnoPin(comp.id, '2');
        if (com && com.pin) this._registerPinBinding(com.pin, comp, 'input');
      } else if (comp.type === 'wokwi-relay-module' || comp.type === 'wokwi-ks2e-m-dc5') {
        const inPin = netlist.findConnectedUnoPin(comp.id, 'IN') || netlist.findConnectedUnoPin(comp.id, '1') || netlist.findConnectedUnoPin(comp.id, '2');
        if (inPin && inPin.pin && !inPin.pin.startsWith('GND') && !inPin.pin.startsWith('5V') && !inPin.pin.startsWith('3.3V')) {
          this._registerPinBinding(inPin.pin, comp, 'output');
        }
      } else if (comp.type === 'board-franzininho-wifi') {
        // Franzininho has onboard Pin 33 (Orange LED) and Pin 21 (Blue LED)
        this._registerPinBinding('33', comp, 'output');
        this._registerPinBinding('21', comp, 'output');
      } else if (comp.type === 'wokwi-led-ring' || comp.type === 'wokwi-neopixel' || comp.type === 'wokwi-neopixel-matrix') {
        const din = netlist.findConnectedUnoPin(comp.id, 'DIN') || netlist.findConnectedUnoPin(comp.id, 'DI') || netlist.findConnectedUnoPin(comp.id, 'IN');
        if (din && din.pin && !din.pin.startsWith('GND') && !din.pin.startsWith('5V')) {
          this._registerPinBinding(din.pin, comp, 'output');
        }
      }
    }

    // Default fallback: If Pin 13 has no registered LED, but there is an LED in the circuit,
    // link pin 13 to the first LED for convenience in basic sketches
    if (!this.pinMap.has('13') && !this.pinMap.has(13)) {
      const firstLed = allComps.find(c => c.type === 'wokwi-led');
      if (firstLed) {
        this._registerPinBinding('13', firstLed, 'output');
      }
    }

    console.log('[SimulationEngine] Built pin map:', Array.from(this.pinMap.entries()).map(([k, v]) => `${k} -> ${v.map(x => x.comp.type).join(',')}`));
  }

  _normalizePin(pin) {
    if (typeof pin === 'string') {
      const clean = pin.trim().toUpperCase();
      if (clean === 'LED_BUILTIN') return '13';
      if (clean.startsWith('D')) return clean.substring(1);
      return clean;
    }
    return String(pin);
  }

  _registerPinBinding(pin, comp, role) {
    const norm = this._normalizePin(pin);
    if (!this.pinMap.has(norm)) {
      this.pinMap.set(norm, []);
    }
    const list = this.pinMap.get(norm);
    if (!list.some(item => item.comp.id === comp.id)) {
      list.push({
        comp: comp,
        element: comp.element,
        role: role
      });
    }

    // Also register numeric key if norm is a number string
    const num = parseInt(norm, 10);
    if (!isNaN(num) && String(num) === norm) {
      if (!this.pinMap.has(num)) {
        this.pinMap.set(num, list);
      }
    }
  }

  _setupButtonInteractivity(comp) {
    if (!comp || !comp.domWrapper || comp._buttonInitialized) return;
    comp._buttonInitialized = true;
    comp.isPressed = false;

    const setPress = (pressed) => {
      comp.isPressed = pressed;
      if (comp.element) {
        comp.element.isPressed = pressed;
        comp.element.pressed = pressed;
      }
      if (pressed) {
        comp.domWrapper.classList.add('btn-active');
      } else {
        comp.domWrapper.classList.remove('btn-active');
      }
    };

    if (comp.domWrapper && typeof comp.domWrapper.addEventListener === 'function') {
      comp.domWrapper.addEventListener('mousedown', () => setPress(true));
      comp.domWrapper.addEventListener('touchstart', (e) => { if (e.preventDefault) e.preventDefault(); setPress(true); }, { passive: false });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('mouseup', () => { if (comp.isPressed) setPress(false); });
      window.addEventListener('touchend', () => { if (comp.isPressed) setPress(false); });
    }
  }

  _setupPotentiometerInteractivity(comp) {
    if (!comp || !comp.element || comp._potInitialized) return;
    comp._potInitialized = true;
    // Listen for knob changes
    comp.element.addEventListener('input', (e) => {
      if (e.target && e.target.value !== undefined) {
        comp.potValue = Number(e.target.value);
      }
    });
  }

  _setupPirInteractivity(comp) {
    if (!comp || !comp.domWrapper || comp._pirInitialized) return;
    comp._pirInitialized = true;
    comp.motionDetected = false;

    comp.domWrapper.style.cursor = 'pointer';
    comp.domWrapper.title = 'Click to trigger PIR motion';
    comp.domWrapper.addEventListener('click', () => {
      comp.motionDetected = true;
      comp.domWrapper.classList.add('btn-active');
      setTimeout(() => {
        comp.motionDetected = false;
        comp.domWrapper.classList.remove('btn-active');
      }, 3000);
    });
  }

  // ---------------------------------------------------------------------------
  // Sensor Readers
  // ---------------------------------------------------------------------------

  readDHT(pin, unit = 'C') {
    const tempC = 23.5 + Math.sin(Date.now() / 6000) * 1.8;
    const humidity = 52.0 + Math.cos(Date.now() / 7000) * 4.5;
    return {
      temperature: unit === 'F' ? (tempC * 1.8 + 32) : tempC,
      humidity: Math.round(humidity * 10) / 10
    };
  }

  readPIR(pin) {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);
    if (bindings) {
      const pir = bindings.find(b => b.comp.type === 'wokwi-pir-motion-sensor');
      if (pir && pir.comp.motionDetected !== undefined) {
        return pir.comp.motionDetected;
      }
    }
    // Random occasional motion if not explicitly clicked
    return Math.random() < 0.05;
  }

  readLDR(pin, isPercent = true) {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);
    let raw = 680 + Math.round(Math.sin(Date.now() / 5000) * 80);
    if (bindings) {
      const ldr = bindings.find(b => b.comp.type === 'wokwi-photoresistor-sensor');
      if (ldr && ldr.comp.element && ldr.comp.element.value !== undefined) {
        raw = Number(ldr.comp.element.value);
      }
    }
    return isPercent ? Math.round(this.mapVal(raw, 0, 1023, 0, 100)) : raw;
  }

  readGas(pin, isDigital = false) {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);
    let raw = 220 + Math.round(Math.sin(Date.now() / 4000) * 35);
    if (bindings) {
      const gas = bindings.find(b => b.comp.type === 'wokwi-gas-sensor');
      if (gas && gas.comp.element && gas.comp.element.value !== undefined) {
        raw = Number(gas.comp.element.value);
      }
    }
    return isDigital ? (raw > 400 ? 1 : 0) : raw;
  }

  readNTC(pin, unit = 'C') {
    const tempC = 24.0 + Math.cos(Date.now() / 8000) * 2.2;
    return unit === 'F' ? (tempC * 1.8 + 32) : Math.round(tempC * 10) / 10;
  }

  readDS18B20(pin, unit = 'C') {
    const tempC = 22.8 + Math.sin(Date.now() / 7500) * 1.4;
    return unit === 'F' ? (tempC * 1.8 + 32) : Math.round(tempC * 100) / 100;
  }

  readBMP180(metric = 'pressure') {
    if (this.circuitCanvas && this.circuitCanvas.netlist) {
      const bmpComp = this.circuitCanvas.netlist.getAllComponents().find(c => c.type === 'board-bmp180');
      if (bmpComp && bmpComp.attrs) {
        const presPa = bmpComp.attrs.pressure ?? 101325;
        const presHpa = presPa / 100.0;
        const temp = bmpComp.attrs.temperature ?? 24.0;
        if (metric === 'temperature') return temp;
        if (metric === 'altitude') return Math.round(44330 * (1.0 - Math.pow(presHpa / 1013.25, 0.1903)));
        if (metric === 'raw_pa') return presPa;
        return presHpa;
      }
    }
    const pressure = 1013.25 + Math.sin(Date.now() / 10000) * 3.5;
    const temp = 24.5 + Math.cos(Date.now() / 9000) * 1.1;
    if (metric === 'temperature') return Math.round(temp * 10) / 10;
    if (metric === 'altitude') return Math.round(44330 * (1.0 - Math.pow(pressure / 1013.25, 0.1903)));
    if (metric === 'raw_pa') return Math.round(pressure * 100);
    return Math.round(pressure * 100) / 100;
  }

  readMFRC522(field = 'card_present') {
    if (this.circuitCanvas && this.circuitCanvas.netlist) {
      const rfidComp = this.circuitCanvas.netlist.getAllComponents().find(c => c.type === 'board-mfrc522');
      if (rfidComp) {
        if (field === 'card_present') return !!rfidComp.tagPresent;
        if (field === 'uid') return rfidComp.selectedUid || '01:02:03:04';
      }
    }
    if (field === 'card_present') return false;
    return '01:02:03:04';
  }

  readHX711(unit = 'G') {
    const grams = 320.0 + Math.sin(Date.now() / 4000) * 5.0;
    return unit === 'KG' ? Math.round((grams / 1000.0) * 1000) / 1000 : Math.round(grams);
  }

  readRTC(field = 'HOUR') {
    const now = new Date();
    switch (field) {
      case 'HOUR': return now.getHours();
      case 'MINUTE': return now.getMinutes();
      case 'SECOND': return now.getSeconds();
      case 'DAY': return now.getDate();
      case 'MONTH': return now.getMonth() + 1;
      case 'YEAR': return now.getFullYear();
      default: return now.getHours();
    }
  }

  readJoystick(pin, axis = 'X') {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);
    if (bindings) {
      const joy = bindings.find(b => b.comp.type === 'wokwi-analog-joystick');
      if (joy && joy.comp.element) {
        if (axis === 'BTN' || axis === 'SEL') {
          return joy.comp.element.buttonPressed ? 1 : 0;
        }
        if (axis === 'X' && joy.comp.element.x !== undefined) return joy.comp.element.x;
        if (axis === 'Y' && joy.comp.element.y !== undefined) return joy.comp.element.y;
      }
    }
    if (axis === 'BTN' || axis === 'SEL') return 0;
    return 512; // Centered analog value
  }

  // ---------------------------------------------------------------------------
  // Lifecycle: start / stop / pause / resume
  // ---------------------------------------------------------------------------

  async start() {
    this.stop(); // Stop any currently running simulation

    this.running = true;
    this.paused = false;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
    this.startTimeMs = Date.now();
    this.perfStart = performance.now();

    this.pinStates.clear();
    this.pinModes.clear();

    // Initialize Web Audio on user gesture (start button)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext init failed (audio muted):', e);
    }

    // Build fresh netlist connections
    this.buildPinMap();

    this._notifyState({ running: true, paused: false });
    this._serialWrite('--- Simulation Started ---\r\n');
  }

  stop() {
    if (!this.running && !this.paused) return;

    this.running = false;
    this.paused = false;

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (e) {}
      this.abortController = null;
    }

    // Stop all audio tones
    this._stopAllTones();

    // Reset visual states of circuit elements
    this._resetCircuit();

    this._notifyState({ running: false, paused: false });
    this._serialWrite('--- Simulation Stopped ---\r\n');
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this._notifyState({ running: true, paused: true });
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this._notifyState({ running: true, paused: false });
  }

  // ---------------------------------------------------------------------------
  // Arduino Hardware APIs
  // ---------------------------------------------------------------------------

  pinMode(pin, mode) {
    const norm = this._normalizePin(pin);
    this.pinModes.set(norm, mode);
  }

  async digitalWrite(pin, value) {
    if (this.signal && this.signal.aborted) return;
    const norm = this._normalizePin(pin);
    const numVal = (value === 1 || value === true || String(value).toUpperCase() === 'HIGH') ? 1 : 0;
    this.pinStates.set(norm, numVal);

    this._updateCircuit(norm, numVal, 'digital');
  }

  async analogWrite(pin, value) {
    if (this.signal && this.signal.aborted) return;
    const norm = this._normalizePin(pin);
    const numVal = Math.max(0, Math.min(255, parseInt(value, 10) || 0));
    this.pinStates.set(norm, numVal);

    this._updateCircuit(norm, numVal, 'pwm');
  }

  digitalRead(pin) {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);

    if (bindings && bindings.length > 0) {
      for (const item of bindings) {
        if (item.comp.type === 'wokwi-pushbutton') {
          // If button is pressed, signal is closed
          const mode = this.pinModes.get(norm) || 'INPUT';
          const isPressed = !!item.comp.isPressed;
          if (mode === 'INPUT_PULLUP') {
            return isPressed ? 0 : 1; // Active LOW in pullup
          }
          return isPressed ? 1 : 0;   // Active HIGH
        }
      }
    }

    return this.pinStates.get(norm) || 0;
  }

  analogRead(pin) {
    const norm = this._normalizePin(pin);
    const bindings = this.pinMap.get(norm);

    if (bindings && bindings.length > 0) {
      for (const item of bindings) {
        if (item.comp.type === 'wokwi-potentiometer') {
          if (item.comp.potValue !== undefined) {
            return item.comp.potValue;
          }
          if (item.element && item.element.value !== undefined) {
            return Number(item.element.value);
          }
        }
      }
    }

    // Default reading or slight floating analog noise
    return Math.floor(Math.random() * 8);
  }

  // Servo Control
  setServoByName(name, angle) {
    const servoComp = this.servoNameMap.get(name) || this.servoNameMap.get('myServo');
    if (servoComp && servoComp.element) {
      const safeAngle = Math.max(0, Math.min(180, Number(angle) || 0));
      servoComp.element.angle = safeAngle;
    }
  }

  // Audio / Tone synthesis
  tone(pin, frequency, duration = 0) {
    if (!this.audioCtx) return;
    const norm = this._normalizePin(pin);
    const freq = Math.max(20, Math.min(20000, Number(frequency) || 440));

    this.noTone(norm); // Stop existing tone on this pin

    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      // Safe, gentle volume (0.05) to avoid loud distortion
      gainNode.gain.setValueAtTime(0.05, this.audioCtx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.start();

      this.oscillators.set(norm, { osc, gainNode });

      // Visual buzzer feedback
      this._updateCircuit(norm, freq, 'tone');

      if (duration > 0) {
        setTimeout(() => {
          if (this.running) this.noTone(norm);
        }, duration);
      }
    } catch (e) {
      console.warn('tone() execution failed:', e);
    }
  }

  noTone(pin) {
    const norm = this._normalizePin(pin);
    const active = this.oscillators.get(norm);
    if (active) {
      try {
        active.gainNode.gain.linearRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.02);
        setTimeout(() => {
          try { active.osc.stop(); } catch (e) {}
        }, 30);
      } catch (e) {}
      this.oscillators.delete(norm);
    }

    // Turn off buzzer visual
    this._updateCircuit(norm, 0, 'tone_off');
  }

  _stopAllTones() {
    for (const [pin] of this.oscillators) {
      this.noTone(pin);
    }
    this.oscillators.clear();
  }

  // Timing
  millis() {
    return Math.floor(Date.now() - this.startTimeMs);
  }

  micros() {
    return Math.floor((performance.now() - this.perfStart) * 1000);
  }

  delay(ms, signal) {
    const dur = Math.max(0, Number(ms) || 0);
    return new Promise((resolve, reject) => {
      let timer = null;

      const abortHandler = () => {
        if (timer) clearTimeout(timer);
        reject(new DOMException('Simulation aborted', 'AbortError'));
      };

      if (signal && signal.aborted) {
        return reject(new DOMException('Simulation aborted', 'AbortError'));
      }

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', abortHandler);
        resolve();
      }, dur);
    });
  }

  // Math Helpers
  random(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return Math.floor(Math.random() * (max - min)) + min;
  }

  mapVal(value, fromLow, fromHigh, toLow, toHigh) {
    return (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow) + toLow;
  }

  constrain(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  // ---------------------------------------------------------------------------
  // Circuit Element Visual State Updates
  // ---------------------------------------------------------------------------

  _updateCircuit(pin, value, mode) {
    const bindings = this.pinMap.get(pin);
    if (!bindings || bindings.length === 0) return;

    for (const item of bindings) {
      const el = item.element;
      const comp = item.comp;
      if (!el) continue;

      if (comp.type === 'wokwi-led') {
        const isOn = value > 0;
        const brightness = mode === 'pwm' ? Math.max(0, Math.min(1, value / 255)) : (isOn ? 1.0 : 0.0);

        // Update Wokwi LED web component properties
        el.value = isOn;
        el.brightness = brightness;

        // Apply visual glow filter to guarantee visibility across all browsers
        if (brightness > 0.05) {
          const color = comp.attrs.color || 'red';
          const glowColor = color === 'green' ? '#22c55e' : (color === 'blue' ? '#3b82f6' : (color === 'yellow' ? '#eab308' : '#ef4444'));
          el.style.filter = `drop-shadow(0 0 ${Math.round(brightness * 12 + 2)}px ${glowColor}) drop-shadow(0 0 2px #ffffff)`;
          el.style.opacity = `${0.65 + brightness * 0.35}`;
        } else {
          el.style.filter = 'none';
          el.style.opacity = '1';
        }
      } else if (comp.type === 'wokwi-servo') {
        let angle = 90;
        if (mode === 'pwm') {
          angle = Math.round((value / 255) * 180);
        } else {
          angle = value ? 180 : 0;
        }
        el.angle = angle;
      } else if (comp.type === 'wokwi-buzzer') {
        if (mode === 'tone' && value > 0) {
          el.style.filter = 'drop-shadow(0 0 10px #f59e0b)';
          if (comp.domWrapper) comp.domWrapper.classList.add('buzzer-ringing');
        } else {
          el.style.filter = 'none';
          if (comp.domWrapper) comp.domWrapper.classList.remove('buzzer-ringing');
        }
      } else if (comp.type === 'wokwi-relay-module' || comp.type === 'wokwi-ks2e-m-dc5') {
        const isOn = value > 0;
        const prevOn = !!el.value;
        el.value = isOn;
        if (typeof el.setAttribute === 'function') {
          el.setAttribute('value', isOn ? '1' : '0');
        }
        if (prevOn !== isOn && window.soundEngine) {
          window.soundEngine.playRelayClick(isOn);
        }
      } else if (comp.type === 'board-franzininho-wifi') {
        const pinNum = parseInt(pin, 10);
        if (typeof el.setLed === 'function') {
          el.setLed(pinNum, value > 0);
        }
      } else if (comp.type === 'wokwi-led-ring' || comp.type === 'wokwi-neopixel' || comp.type === 'wokwi-neopixel-matrix') {
        if (value > 0) {
          el.style.filter = 'drop-shadow(0 0 10px #38bdf8)';
        } else {
          el.style.filter = 'none';
        }
      }
    }
  }

  _resetCircuit() {
    if (!this.circuitCanvas || !this.circuitCanvas.netlist) return;

    const allComps = this.circuitCanvas.netlist.getAllComponents();
    for (const comp of allComps) {
      const el = comp.element;
      if (!el) continue;

      if (comp.type === 'wokwi-led') {
        el.value = false;
        el.brightness = 0;
        el.style.filter = 'none';
        el.style.opacity = '1';
      } else if (comp.type === 'wokwi-servo') {
        el.angle = 90;
      } else if (comp.type === 'wokwi-buzzer') {
        el.style.filter = 'none';
        if (comp.domWrapper) comp.domWrapper.classList.remove('buzzer-ringing');
      } else if (comp.type === 'wokwi-pushbutton') {
        if (comp.domWrapper) comp.domWrapper.classList.remove('btn-active');
      } else if (comp.type === 'wokwi-relay-module' || comp.type === 'wokwi-ks2e-m-dc5') {
        el.value = false;
        if (typeof el.setAttribute === 'function') el.setAttribute('value', '0');
      } else if (comp.type === 'board-franzininho-wifi') {
        if (typeof el.setLed === 'function') {
          el.setLed(33, false);
          el.setLed(21, false);
        }
      } else if (comp.type === 'wokwi-led-ring' || comp.type === 'wokwi-neopixel' || comp.type === 'wokwi-neopixel-matrix') {
        el.style.filter = 'none';
      }
    }
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.SimulationEngine = SimulationEngine;
}
if (typeof module !== 'undefined') {
  module.exports = SimulationEngine;
}
