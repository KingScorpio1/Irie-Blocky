// js/multimeter_probe.js — Interactive HUD Multimeter & Live Voltage Probe
// Inspects live electrical nodes, voltage (V), current (mA), logic state, and PWM duty cycle in real time.

class MultimeterProbe {
  constructor(circuitCanvas) {
    this.canvas = circuitCanvas;
    this.active = false;
    this.hudElement = null;
    this.benchModal = null;
    this.mode = 'VDC'; // 'VDC', 'VAC', 'RES', 'CUR', 'CONT'

    this.initHud();
    this.bindEvents();
  }

  initHud() {
    let hud = document.getElementById('multimeterProbeHud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'multimeterProbeHud';
      hud.style.cssText = `
        position: fixed;
        display: none;
        pointer-events: none;
        z-index: 10000;
        background: rgba(15, 23, 42, 0.94);
        border: 1px solid #38bdf8;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.25);
        padding: 8px 12px;
        color: #ffffff;
        font-family: 'Inter', -apple-system, sans-serif;
        min-width: 170px;
        transform: translate(15px, 15px);
        backdrop-filter: blur(6px);
      `;
      document.body.appendChild(hud);
    }
    this.hudElement = hud;
  }

  toggle(force = !this.active) {
    this.active = force;
    const btn = document.getElementById('multimeterProbeBtn');
    if (btn) {
      if (this.active) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        btn.style.background = '#0284c7';
        btn.style.borderColor = '#0284c7';
        btn.style.color = '#ffffff';
        if (this.canvas && this.canvas.board) {
          this.canvas.board.style.cursor = 'crosshair';
        }
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        if (this.canvas && this.canvas.board) {
          this.canvas.board.style.cursor = '';
        }
        this.hideHud();
      }
    }
    return this.active;
  }

  bindEvents() {
    document.addEventListener('keydown', (e) => {
      // Toggle shortcut 'm' or 'M' when not typing in text input
      if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        this.toggle();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      this.handleHover(e);
    });
  }

  handleHover(e) {
    // Check if hovering over a pin dot, wire, or component terminal
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) {
      this.hideHud();
      return;
    }

    const pinDot = target.closest('.pin-dot');
    const wirePath = target.closest('.circuit-wire');
    const compWrapper = target.closest('.circuit-component');

    if (pinDot) {
      const pinName = pinDot.getAttribute('data-pin');
      const compId = compWrapper ? compWrapper.id.replace('comp-', '') : null;
      this.showProbeData(e.clientX, e.clientY, compId, pinName, null);
    } else if (wirePath) {
      const wireId = wirePath.getAttribute('data-wire-id');
      this.showProbeData(e.clientX, e.clientY, null, null, wireId);
    } else {
      this.hideHud();
    }
  }

  showProbeData(clientX, clientY, compId, pinName, wireId) {
    if (!this.hudElement) return;

    let probeInfo = this.readElectricalState(compId, pinName, wireId);

    let currentWarning = '';
    if (probeInfo.currentMa > 25 && probeInfo.compType === 'wokwi-led') {
      currentWarning = `<div style="font-size:0.68rem; color:#ef4444; font-weight:700; margin-top:3px;">&#x26A0; OVERCURRENT: ${probeInfo.currentMa.toFixed(1)} mA (Max 20mA)!</div>`;
    }

    this.hudElement.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:4px; margin-bottom:6px;">
        <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; color:#38bdf8;">&#x26A1; MULTIMETER PROBE</span>
        <span style="font-size:0.65rem; background:rgba(56,189,248,0.2); padding:1px 5px; border-radius:4px; color:#38bdf8; font-weight:600;">${probeInfo.logicState}</span>
      </div>
      <div style="display:flex; align-items:baseline; gap:6px;">
        <span style="font-size:1.4rem; font-family:'Courier New', monospace; font-weight:800; color:#38bdf8;">${probeInfo.voltageStr}</span>
        <span style="font-size:0.8rem; font-weight:600; color:#94a3b8;">${probeInfo.unit}</span>
      </div>
      <div style="font-size:0.72rem; color:#cbd5e1; margin-top:4px;">
        <div><strong>Node:</strong> ${probeInfo.nodeLabel}</div>
        <div><strong>Current:</strong> ${probeInfo.currentStr}</div>
        ${probeInfo.pwmStr ? `<div><strong>PWM:</strong> ${probeInfo.pwmStr}</div>` : ''}
      </div>
      ${currentWarning}
    `;

    this.hudElement.style.display = 'block';
    this.hudElement.style.left = `${clientX + 12}px`;
    this.hudElement.style.top = `${clientY + 12}px`;
  }

  hideHud() {
    if (this.hudElement) {
      this.hudElement.style.display = 'none';
    }
  }

  readElectricalState(compId, pinName, wireId) {
    const engine = typeof ArduinoBlockly !== 'undefined' ? ArduinoBlockly.getSimulationEngine() : null;
    const isRunning = engine && engine.running;

    let nodeLabel = 'Unknown Pin';
    let compType = '';
    let voltage = 0.0;
    let voltageStr = '0.000';
    let unit = 'V DC';
    let logicState = 'LOW';
    let currentMa = 0.0;
    let currentStr = '0.0 mA';
    let pwmStr = '';

    if (compId && this.canvas && this.canvas.netlist) {
      const comp = this.canvas.netlist.getComponent(compId);
      if (comp) {
        compType = comp.type;
        nodeLabel = `${comp.type} [${pinName}]`;

        // 1. Power rails
        if (pinName === '5V' || pinName === 'VCC') {
          voltage = 5.0;
          voltageStr = '5.000';
          logicState = 'VCC (+5V)';
          currentStr = isRunning ? '~45 mA' : '0 mA';
        } else if (pinName === '3.3V' || pinName === '3V3') {
          voltage = 3.3;
          voltageStr = '3.300';
          logicState = '3.3V Rail';
          currentStr = isRunning ? '~12 mA' : '0 mA';
        } else if (pinName === 'GND') {
          voltage = 0.0;
          voltageStr = '0.000';
          logicState = 'GND (0V)';
          currentStr = isRunning ? 'Return' : '0 mA';
        } else if (comp.type === 'wokwi-arduino-uno' || comp.type === 'board-stm32-bluepill' || comp.type === 'wokwi-pi-pico') {
          // Microcontroller pins
          const pinNum = parseInt(pinName);
          if (!isNaN(pinNum) && engine && isRunning) {
            const state = engine.pinStates ? engine.pinStates.get(pinNum) : 0;
            const isPwm = [3, 5, 6, 9, 10, 11].includes(pinNum);

            if (state > 1) {
              // PWM value (0-255)
              const duty = (state / 255.0);
              voltage = duty * 5.0;
              voltageStr = voltage.toFixed(3);
              logicState = `PWM (${Math.round(duty * 100)}%)`;
              pwmStr = `${Math.round(duty * 100)}% @ 490 Hz`;
              currentMa = duty * 15.0;
              currentStr = `~${currentMa.toFixed(1)} mA`;
            } else if (state === 1) {
              voltage = 5.0;
              voltageStr = '5.000';
              logicState = 'HIGH';
              currentMa = 18.2;
              currentStr = '~18.2 mA';
            } else {
              voltage = 0.0;
              voltageStr = '0.000';
              logicState = 'LOW';
              currentStr = '0.0 mA';
            }
          } else if (pinName.startsWith('A')) {
            // Analog Input
            const val = engine && isRunning ? engine.analogRead(pinName) : 0;
            voltage = (val / 1023.0) * 5.0;
            voltageStr = voltage.toFixed(3);
            logicState = `ADC ${val}`;
            currentStr = '< 1 µA (Hi-Z)';
          }
        } else if (comp.type === 'wokwi-led') {
          // LED anode / cathode
          if (isRunning) {
            const isLit = comp.element && (comp.element.value || comp.element.brightness > 0);
            if (pinName === 'A' || pinName === 'anode') {
              voltage = isLit ? 2.05 : 0.0;
              voltageStr = voltage.toFixed(3);
              logicState = isLit ? 'Forward Bias' : 'Off';
              currentMa = isLit ? 16.5 : 0.0;
              currentStr = isLit ? `${currentMa.toFixed(1)} mA` : '0 mA';
            } else {
              voltage = 0.0;
              voltageStr = '0.000';
              logicState = 'GND Return';
              currentStr = isLit ? '16.5 mA' : '0 mA';
            }
          }
        } else if (comp.type === 'wokwi-resistor') {
          const rVal = comp.attrs?.value || 220;
          voltage = isRunning ? 2.95 : 0.0;
          voltageStr = voltage.toFixed(3);
          logicState = `R = ${rVal} Ω`;
          currentMa = isRunning ? (2.95 / rVal) * 1000 : 0;
          currentStr = isRunning ? `~${currentMa.toFixed(1)} mA` : '0 mA';
        }
      }
    } else if (wireId && this.canvas && this.canvas.netlist) {
      const wire = this.canvas.netlist.wires.find(w => w.id === wireId);
      if (wire) {
        nodeLabel = `Wire: ${wire.from.pin} ➔ ${wire.to.pin}`;
        if (wire.color === '#e53e3e') {
          voltageStr = '5.000';
          logicState = 'VCC (+5V Wire)';
          currentStr = isRunning ? '~35 mA' : '0 mA';
        } else if (wire.color === '#1a202c') {
          voltageStr = '0.000';
          logicState = 'GND Wire';
          currentStr = isRunning ? 'Return' : '0 mA';
        } else {
          voltageStr = isRunning ? '4.980' : '0.000';
          logicState = isRunning ? 'Signal Wire (ACTIVE)' : 'IDLE';
          currentStr = isRunning ? '~18 mA' : '0 mA';
        }
      }
    }

    if (!isRunning) {
      logicState = 'SIM STOPPED';
    }

    return {
      nodeLabel,
      compType,
      voltage,
      voltageStr,
      unit,
      logicState,
      currentMa,
      currentStr,
      pwmStr
    };
  }
}

window.MultimeterProbe = MultimeterProbe;
