// Main Application Controller for Arduino Blockly Editor
const ArduinoBlockly = (function() {
  let workspace = null;
  let isInitialized = false;
  let codeChangeTimeout = null;
  let simulationEngine = null;
  let simRunner = null;

  // Safe XML parsing helper supporting all Blockly versions
  function parseXml(xmlText) {
    if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.textToDom === 'function') {
      return Blockly.utils.xml.textToDom(xmlText);
    }
    if (Blockly.Xml && typeof Blockly.Xml.textToDom === 'function') {
      return Blockly.Xml.textToDom(xmlText);
    }
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml').documentElement;
  }

  function domToXmlText(dom) {
    if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.domToText === 'function') {
      return Blockly.utils.xml.domToText(dom);
    }
    if (Blockly.Xml && typeof Blockly.Xml.domToPrettyText === 'function') {
      return Blockly.Xml.domToPrettyText(dom);
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(dom);
  }

  function ensureDefaultBlocks() {
    if (!workspace) return;
    const blocks = workspace.getAllBlocks();
    const hasSetup = blocks.some(b => b.type === 'arduino_setup');
    const hasLoop = blocks.some(b => b.type === 'arduino_loop');

    if (!hasSetup) {
      const setupBlock = workspace.newBlock('arduino_setup');
      setupBlock.initSvg();
      setupBlock.render();
      setupBlock.moveBy(40, 30);
    }

    if (!hasLoop) {
      const loopBlock = workspace.newBlock('arduino_loop');
      loopBlock.initSvg();
      loopBlock.render();
      loopBlock.moveBy(40, 220);
    }
  }

  return {
    getWorkspace: function() {
      return workspace;
    },

    initializeWorkspace: function() {
      try {
        this.showStatus('Initializing Blockly workspace...', 'info');

        // Polyfill Blockly.Xml.textToDom if missing in Blockly v13
        if (typeof Blockly !== 'undefined') {
          if (!Blockly.Xml) Blockly.Xml = {};
          if (!Blockly.Xml.textToDom) Blockly.Xml.textToDom = parseXml;
          if (!Blockly.Xml.domToPrettyText) Blockly.Xml.domToPrettyText = domToXmlText;
        }

        // Define blocks and generator
        defineArduinoBlocks();
        defineArduinoGenerator();

        if (workspace) {
          workspace.dispose();
        }

        // Inject Blockly (v13 compatible options)
        workspace = Blockly.inject('blocklyDiv', {
          toolbox: document.getElementById('toolbox'),
          trashcan: true,
          maxTrashcanContents: 32,  // Enable recycle flyout (store up to 32 deleted blocks)
          sounds: false,            // Disabled: sounds try to load from static.blockly.com
                                    // which 404s on file:// and blocks the trashcan drop handler
          zoom: {
            controls: true,
            wheel: true,
            startScale: 0.85,
            maxScale: 2.5,
            minScale: 0.3,
            scaleSpeed: 1.15
          },
          grid: {
            spacing: 25,
            length: 3,
            colour: '#ddd',
            snap: true
          },
          move: {
            scrollbars: {
              horizontal: true,
              vertical: true
            },
            drag: true,
            wheel: false  // Keep false to avoid conflict with zoom.wheel
          }
        });

        // Try restoring saved workspace from localStorage or add defaults
        const savedData   = localStorage.getItem('arduino_blockly_workspace');
        const savedFormat = localStorage.getItem('arduino_blockly_format') || 'xml';
        if (savedData) {
          try {
            if (savedFormat === 'json' && Blockly.serialization && Blockly.serialization.workspaces) {
              Blockly.serialization.workspaces.load(JSON.parse(savedData), workspace);
            } else if (Blockly.Xml && Blockly.Xml.domToWorkspace) {
              const xml = parseXml(savedData);
              Blockly.Xml.domToWorkspace(xml, workspace);
            } else {
              ensureDefaultBlocks();
            }
          } catch (e) {
            console.warn('Could not restore saved workspace:', e);
            ensureDefaultBlocks();
          }
        } else {
          ensureDefaultBlocks();
        }

        // Real-time live code sync on workspace change
        workspace.addChangeListener((event) => {
          if (event.isUiEvent) return;

          // Debounce code generation for smooth performance
          clearTimeout(codeChangeTimeout);
          codeChangeTimeout = setTimeout(() => {
            this.generateCode(true);
            this.updateBlockCount();
          }, 150);
        });

        isInitialized = true;
        this.generateCode(true);
        this.updateBlockCount();
        this.showStatus('Workspace ready! Tinkercad-style Blocks + Live C++ active.', 'success');

        // Resize on next animation frame
        requestAnimationFrame(() => {
          Blockly.svgResize(workspace);
        });

      } catch (error) {
        console.error('Initialization error:', error);
        this.showStatus('Initialization failed: ' + error.message, 'error');
      }
    },

    updateBlockCount: function() {
      if (!workspace) return;
      const count = workspace.getAllBlocks().length;
      const counterEl = document.getElementById('blockCountBadge');
      if (counterEl) {
        counterEl.textContent = `${count} block${count === 1 ? '' : 's'}`;
      }
    },

    generateCode: function(silent = false) {
      if (!isInitialized || !workspace) {
        if (!silent) this.showStatus('Workspace not ready!', 'error');
        return '';
      }

      try {
        const code = Blockly.Arduino.workspaceToCode(workspace);
        const codeOutput = document.getElementById('codeOutput');
        if (codeOutput) {
          codeOutput.textContent = code || '// No blocks in workspace';
        }

        if (!silent) {
          const blocks = workspace.getAllBlocks();
          this.showStatus(`Code generated successfully (${blocks.length} blocks)`, 'success');
        }
        return code;
      } catch (error) {
        console.error('Code generation error:', error);
        if (!silent) this.showStatus('Code generation error: ' + error.message, 'error');
        const codeOutput = document.getElementById('codeOutput');
        if (codeOutput) {
          codeOutput.textContent = '// Error generating code: ' + error.message;
        }
        return '';
      }
    },

    validateCode: function() {
      if (!workspace) {
        this.showStatus('Workspace not initialized!', 'error');
        return;
      }

      try {
        const blocks = workspace.getAllBlocks();
        const hasSetup = blocks.some(b => b.type === 'arduino_setup');
        const hasLoop  = blocks.some(b => b.type === 'arduino_loop');

        // Blockly v10+ uses forBlock, v8 uses direct property
        const forBlock = (Blockly.Arduino && Blockly.Arduino.forBlock) || Blockly.Arduino || {};
        const missing  = blocks.filter(b => typeof forBlock[b.type] !== 'function');
        const issues   = [];

        if (!hasSetup) issues.push('Missing "Setup" block');
        if (!hasLoop)  issues.push('Missing "Loop" block');
        if (missing.length > 0) {
          issues.push(`Missing generators for: ${[...new Set(missing.map(b => b.type))].join(', ')}`);
        }

        if (issues.length === 0) {
          this.showStatus('Validation Passed: Sketch structure is 100% valid!', 'success');
        } else {
          this.showStatus('Validation Warnings: ' + issues.join('; '), 'error');
        }
      } catch (error) {
        this.showStatus('Validation error: ' + error.message, 'error');
      }
    },

    debugBlocks: function() {
      if (!workspace) {
        this.showStatus('Workspace not initialized!', 'error');
        return;
      }

      const blocks   = workspace.getAllBlocks();
      // Blockly v10+ uses forBlock; fall back to direct property for v8
      const forBlock = (Blockly.Arduino && Blockly.Arduino.forBlock) || Blockly.Arduino || {};

      console.group('IrieBlocky Workspace Diagnostic');
      console.log('Blockly version API:', Blockly.Arduino && Blockly.Arduino.forBlock ? 'v10+ (forBlock)' : 'v8 (direct)');
      console.log('Total blocks:', blocks.length);
      console.log('Arduino Generator exists:', !!Blockly.Arduino);

      const missing = [];
      blocks.forEach((b, i) => {
        const hasGen = typeof forBlock[b.type] === 'function';
        if (!hasGen) missing.push(b.type);
        console.log(`[#${i + 1}] Type: ${b.type}, Has Generator: ${hasGen}`);
      });

      console.groupEnd();

      if (missing.length > 0) {
        this.showStatus(`Diagnostic: ${missing.length} blocks missing generators. Check console.`, 'error');
      } else {
        this.showStatus(`Diagnostic: All ${blocks.length} blocks have valid generators!`, 'success');
      }
    },

    clearWorkspace: function() {
      if (!workspace) return;
      if (confirm('Are you sure you want to clear the entire workspace?')) {
        workspace.clear();
        ensureDefaultBlocks();
        this.generateCode(true);
        this.updateBlockCount();
        this.showStatus('Workspace cleared and reset to default.', 'info');
      }
    },

    saveWorkspace: function() {
      if (!workspace) return;
      try {
        let savedData;
        // Blockly v10+ supports JSON serialization (preferred)
        if (Blockly.serialization && Blockly.serialization.workspaces) {
          savedData = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
          localStorage.setItem('arduino_blockly_format', 'json');
        } else {
          // Legacy Blockly.Xml fallback
          const dom = Blockly.Xml.workspaceToDom(workspace);
          savedData = Blockly.Xml.domToPrettyText(dom);
          localStorage.setItem('arduino_blockly_format', 'xml');
        }
        localStorage.setItem('arduino_blockly_workspace', savedData);
        this.showStatus('Workspace saved!', 'success');
      } catch (e) {
        this.showStatus('Save failed: ' + e.message, 'error');
      }
    },

    loadWorkspace: function() {
      if (!workspace) return;
      const savedData = localStorage.getItem('arduino_blockly_workspace');
      if (!savedData) {
        this.showStatus('No saved workspace found in browser storage.', 'error');
        return;
      }
      try {
        const format = localStorage.getItem('arduino_blockly_format') || 'xml';
        workspace.clear();

        if (format === 'json' && Blockly.serialization && Blockly.serialization.workspaces) {
          Blockly.serialization.workspaces.load(JSON.parse(savedData), workspace);
        } else if (Blockly.Xml && Blockly.Xml.domToWorkspace) {
          const dom = parseXml(savedData);
          Blockly.Xml.domToWorkspace(dom, workspace);
        } else {
          throw new Error('No compatible workspace deserialization API found.');
        }

        this.generateCode(true);
        this.updateBlockCount();
        this.showStatus('Workspace loaded!', 'success');
      } catch (e) {
        this.showStatus('Load failed: ' + e.message, 'error');
        ensureDefaultBlocks();
      }
    },

    copyCode: function() {
      const code = this.generateCode(true);
      if (!code) {
        this.showStatus('No code to copy.', 'error');
        return;
      }
      navigator.clipboard.writeText(code).then(() => {
        this.showStatus('C++ Code copied to clipboard!', 'success');
      }).catch(err => {
        this.showStatus('Clipboard copy failed: ' + err.message, 'error');
      });
    },

    exportIno: function() {
      const code = this.generateCode(true);
      if (!code) {
        this.showStatus('No code to export.', 'error');
        return;
      }
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sketch.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showStatus('Downloaded sketch.ino successfully!', 'success');
    },

    loadFromCpp: function() {
      const input = document.getElementById('cppInput');
      if (!input || !input.value.trim()) {
        this.showStatus('Please paste some Arduino C++ code first.', 'error');
        return;
      }
      try {
        const res = parseCppCode(input.value, workspace);
        this.generateCode(true);
        this.updateBlockCount();
        this.showStatus(`Parsed C++ successfully! (${res.setupCount} setup, ${res.loopCount} loop blocks)`, 'success');
      } catch (e) {
        this.showStatus('C++ parsing failed: ' + e.message, 'error');
      }
    },

    showStatus: function(message, type = 'info', duration = 3500) {
      const statusDiv = document.getElementById('statusDiv');
      if (!statusDiv) return;
      statusDiv.textContent = message;
      statusDiv.className = `status-banner ${type}`;
      statusDiv.style.opacity = '1';
      statusDiv.style.display = 'flex';

      clearTimeout(statusDiv.timeoutId);
      statusDiv.timeoutId = setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => {
          if (statusDiv.style.opacity === '0') {
            statusDiv.style.display = 'none';
          }
        }, 300);
      }, duration);
    },

    // -------------------------------------------------------------------------
    // Simulation Engine & Serial Monitor Controller
    // -------------------------------------------------------------------------

    initSimulation: function() {
      if (typeof SimulationEngine !== 'undefined' && !simulationEngine) {
        simulationEngine = new SimulationEngine();
        simRunner = new SimRunner(simulationEngine);

        // Serial output callback
        simulationEngine.onSerialData((chunk) => {
          const consoleEl = document.getElementById('serialConsole');
          if (!consoleEl) return;

          const timestampCb = document.getElementById('serialTimestamps');
          const autoscrollCb = document.getElementById('serialAutoScroll');

          let textToAdd = chunk;
          if (timestampCb && timestampCb.checked && chunk.trim()) {
            const timeStr = new Date().toLocaleTimeString();
            textToAdd = `[${timeStr}] ` + textToAdd;
          }

          consoleEl.textContent += textToAdd;

          if (!autoscrollCb || autoscrollCb.checked) {
            consoleEl.scrollTop = consoleEl.scrollHeight;
          }
        });

        // State change callback
        simulationEngine.onStateChange((state) => {
          const btnStart = document.getElementById('btnSimStart');
          const btnStop = document.getElementById('btnSimStop');
          const statusPill = document.getElementById('simStatusPill');
          const statusText = document.getElementById('simStatusText');

          if (state.running) {
            if (btnStart) btnStart.style.display = 'none';
            if (btnStop) btnStop.style.display = 'inline-flex';
            if (statusPill) statusPill.classList.add('running');
            if (statusText) statusText.textContent = 'Running';
          } else {
            if (btnStart) btnStart.style.display = 'inline-flex';
            if (btnStop) btnStop.style.display = 'none';
            if (statusPill) statusPill.classList.remove('running');
            if (statusText) statusText.textContent = 'Stopped';
          }
        });
      }
    },

    startSimulation: async function() {
      if (!workspace) {
        this.showStatus('Blockly workspace not ready!', 'error');
        return;
      }

      this.initSimulation();
      if (!simulationEngine || !simRunner) {
        this.showStatus('Simulation Engine not loaded!', 'error');
        return;
      }

      try {
        // Link to CircuitCanvas if available
        if (window.circuitCanvas) {
          simulationEngine.setCircuit(window.circuitCanvas);
        }

        // Generate and sync fresh C++ code
        this.generateCode(true);

        // Start virtual Arduino runtime
        await simulationEngine.start();
        this.showStatus('Simulation started!', 'success', 2500);

        // Let a hosting page (e.g. an embedding lesson) know a run happened,
        // and whether the circuit was healthy at that moment.
        if (window.parent && window.parent !== window) {
          const healthy = !window.circuitHealthChecker || window.circuitHealthChecker.issues.length === 0;
          try {
            window.parent.postMessage({ source: 'irieblocky', type: 'simStarted', healthy }, '*');
          } catch (e) {}
        }

        // Launch block interpreter asynchronously (does not block browser)
        simRunner.run(workspace).catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('SimRunner error:', err);
            this.showStatus('Simulation error: ' + err.message, 'error');
          }
        });
      } catch (err) {
        this.showStatus('Failed to start simulation: ' + err.message, 'error');
      }
    },

    stopSimulation: function() {
      if (simulationEngine) {
        simulationEngine.stop();
        this.showStatus('Simulation stopped.', 'info', 2000);
      }
    },

    toggleSimulation: function() {
      if (simulationEngine && simulationEngine.running) {
        this.stopSimulation();
      } else {
        this.startSimulation();
      }
    },

    clearSerialOutput: function() {
      const consoleEl = document.getElementById('serialConsole');
      if (consoleEl) consoleEl.textContent = '';
      if (simulationEngine) simulationEngine.clearSerial();
    },

    sendSerialData: function() {
      const inputEl = document.getElementById('serialInputText');
      if (!inputEl || !inputEl.value) return;

      const text = inputEl.value;
      if (simulationEngine) {
        simulationEngine.sendSerialInput(text + '\n');
        // Echo sent data
        const consoleEl = document.getElementById('serialConsole');
        if (consoleEl) {
          consoleEl.textContent += `> ${text}\r\n`;
          consoleEl.scrollTop = consoleEl.scrollHeight;
        }
      }
      inputEl.value = '';
    },

    getSimulationEngine: function() {
      return simulationEngine;
    },

    getSimRunner: function() {
      return simRunner;
    },

    loadSampleProject: function(projectId) {
      if (simulationEngine && simulationEngine.running) {
        simulationEngine.stop();
      }

      const canvas = window.circuitCanvas;
      if (!canvas) return;

      canvas.clearCircuit();

      let code = '';
      let desc = '';

      switch (projectId) {
        case 'traffic_lights': {
          desc = 'Traffic Lights (Neat Manhattan 90° Wiring)';
          const uno = canvas.addComponent('wokwi-arduino-uno', 140, 220);
          const r1 = canvas.addComponent('wokwi-resistor', 430, 110, { value: 200 });
          const r2 = canvas.addComponent('wokwi-resistor', 430, 145, { value: 200 });
          const r3 = canvas.addComponent('wokwi-resistor', 430, 180, { value: 200 });
          const d1 = canvas.addComponent('wokwi-led', 540, 210, { color: 'blue' });
          const d2 = canvas.addComponent('wokwi-led', 540, 260, { color: 'blue' });
          const d3 = canvas.addComponent('wokwi-led', 540, 310, { color: 'blue' });

          // Neat Manhattan routing matching Screenshot 081210
          canvas.netlist.addWire(
            { compId: uno.id, pin: '3' },
            { compId: r1.id, pin: '1' },
            '#38a169',
            [{ x: 365, y: 115 }]
          );
          canvas.netlist.addWire(
            { compId: uno.id, pin: '2' },
            { compId: r2.id, pin: '1' },
            '#d69e2e',
            [{ x: 374.5, y: 150 }]
          );
          canvas.netlist.addWire(
            { compId: uno.id, pin: 'TX' },
            { compId: r3.id, pin: '1' },
            '#e53e3e',
            [{ x: 384, y: 185 }]
          );

          canvas.netlist.addWire(
            { compId: r1.id, pin: '2' },
            { compId: d1.id, pin: 'A' },
            '#38a169',
            [{ x: 590, y: 115 }, { x: 590, y: 230 }]
          );
          canvas.netlist.addWire(
            { compId: r2.id, pin: '2' },
            { compId: d2.id, pin: 'A' },
            '#d69e2e',
            [{ x: 575, y: 150 }, { x: 575, y: 280 }]
          );
          canvas.netlist.addWire(
            { compId: r3.id, pin: '2' },
            { compId: d3.id, pin: 'A' },
            '#e53e3e',
            [{ x: 560, y: 185 }, { x: 560, y: 330 }]
          );

          // Clean Ground Loop under Uno & LEDs
          canvas.netlist.addWire(
            { compId: uno.id, pin: 'GND.2' },
            { compId: d3.id, pin: 'C' },
            '#1a202c',
            [{ x: 293.5, y: 470 }, { x: 510, y: 470 }, { x: 510, y: 330 }]
          );
          canvas.netlist.addWire(
            { compId: d3.id, pin: 'C' },
            { compId: d2.id, pin: 'C' },
            '#1a202c',
            [{ x: 510, y: 330 }, { x: 510, y: 280 }]
          );
          canvas.netlist.addWire(
            { compId: d2.id, pin: 'C' },
            { compId: d1.id, pin: 'C' },
            '#1a202c',
            [{ x: 510, y: 280 }, { x: 510, y: 230 }]
          );

          canvas.renderWires();

          code = `// C++ code
// 3x Blue LEDs with 200 Ohm Resistors & Neat Wiring
void setup() {
  pinMode(1, OUTPUT);
  pinMode(2, OUTPUT);
  pinMode(3, OUTPUT);
}

void loop() {
  digitalWrite(1, HIGH);
  delay(1000);
  digitalWrite(1, LOW);
  delay(1000);

  digitalWrite(2, HIGH);
  delay(1000);
  digitalWrite(2, LOW);
  delay(1000);

  digitalWrite(3, HIGH);
  delay(1000);
  digitalWrite(3, LOW);
  delay(1000);
}`;
          break;
        }

        case 'bmp180': {
          desc = 'BMP180 Barometric Pressure & Temperature Sensor';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const bmp = canvas.addComponent('board-bmp180', 400, 80, { temperature: 24, pressure: 101325 });

          canvas.netlist.addWire({ compId: bmp.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: bmp.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.netlist.addWire({ compId: bmp.id, pin: 'SDA' }, { compId: uno.id, pin: 'A4' }, '#3182ce');
          canvas.netlist.addWire({ compId: bmp.id, pin: 'SCL' }, { compId: uno.id, pin: 'A5' }, '#3182ce');
          canvas.renderWires();

          code = `#include <Wire.h>
#include <Adafruit_BMP085.h>

Adafruit_BMP085 bmp;

void setup() {
  Serial.begin(115200);

  if (!bmp.begin()) {
    Serial.println("BMP180 not found!");
    while (1);
  }

  Serial.println("BMP180 ready!");
}

void loop() {
  float temperature = bmp.readTemperature();
  int32_t pressure = bmp.readPressure();
  float altitude = bmp.readAltitude();

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Pressure: ");
  Serial.print(pressure);
  Serial.println(" Pa");

  Serial.print("Altitude: ");
  Serial.print(altitude);
  Serial.println(" m");

  Serial.println();
  delay(1000);
}`;
          break;
        }

        case 'mfrc522': {
          desc = 'MFRC522 RFID Card Reader (SPI)';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const rfid = canvas.addComponent('board-mfrc522', 400, 70, { uid: '01:02:03:04' });

          canvas.netlist.addWire({ compId: rfid.id, pin: '3.3V' }, { compId: uno.id, pin: '3.3V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'RST' }, { compId: uno.id, pin: '9' }, '#805ad5');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'MISO' }, { compId: uno.id, pin: '12' }, '#38a169');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'MOSI' }, { compId: uno.id, pin: '11' }, '#38a169');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'SCK' }, { compId: uno.id, pin: '13' }, '#38a169');
          canvas.netlist.addWire({ compId: rfid.id, pin: 'SDA' }, { compId: uno.id, pin: '10' }, '#3182ce');
          canvas.renderWires();

          code = `#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN  10
#define RST_PIN 9

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("MFRC522 Ready");
  Serial.println("Scan a card...");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }
  Serial.print("Card UID:");
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();
  rfid.PICC_HaltA();
  delay(1000);
}`;
          break;
        }

        case 'dht22': {
          desc = 'DHT22 Temperature & Humidity Sensor';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const dht = canvas.addComponent('wokwi-dht22', 400, 80);

          canvas.netlist.addWire({ compId: dht.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: dht.id, pin: 'SDA' }, { compId: uno.id, pin: '2' }, '#38a169');
          canvas.netlist.addWire({ compId: dht.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `#include "DHT.h"
#define DHTPIN 2
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("DHT22 Sensor Initialized");
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  Serial.print("Humidity: ");
  Serial.print(h);
  Serial.print("%  Temperature: ");
  Serial.print(t);
  Serial.println(" C");
  delay(2000);
}`;
          break;
        }

        case 'sonar': {
          desc = 'HC-SR04 Ultrasonic Sonar Distance';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const sonar = canvas.addComponent('wokwi-hc-sr04', 400, 80);

          canvas.netlist.addWire({ compId: sonar.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: sonar.id, pin: 'TRIG' }, { compId: uno.id, pin: '9' }, '#805ad5');
          canvas.netlist.addWire({ compId: sonar.id, pin: 'ECHO' }, { compId: uno.id, pin: '10' }, '#38a169');
          canvas.netlist.addWire({ compId: sonar.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `const int trigPin = 9;
const int echoPin = 10;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;
  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  delay(500);
}`;
          break;
        }

        case 'servo': {
          desc = 'Servo Motor 0°-180° Sweep';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const servo = canvas.addComponent('wokwi-servo', 400, 80);

          canvas.netlist.addWire({ compId: servo.id, pin: 'V+' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: servo.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: servo.id, pin: 'PWM' }, { compId: uno.id, pin: '9' }, '#dd6b20');
          canvas.renderWires();

          code = `#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int pos = 0; pos <= 180; pos += 15) {
    myServo.write(pos);
    delay(100);
  }
  for (int pos = 180; pos >= 0; pos -= 15) {
    myServo.write(pos);
    delay(100);
  }
}`;
          break;
        }

        case 'pot_dimmer': {
          desc = 'Potentiometer PWM LED Dimmer';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const pot = canvas.addComponent('wokwi-potentiometer', 380, 80);
          const res = canvas.addComponent('wokwi-resistor', 480, 180, { value: 220 });
          const led = canvas.addComponent('wokwi-led', 560, 180, { color: 'blue' });

          canvas.netlist.addWire({ compId: pot.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: pot.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.netlist.addWire({ compId: pot.id, pin: 'SIG' }, { compId: uno.id, pin: 'A0' }, '#3182ce');

          canvas.netlist.addWire({ compId: uno.id, pin: '9' }, { compId: res.id, pin: '1' }, '#38a169');
          canvas.netlist.addWire({ compId: res.id, pin: '2' }, { compId: led.id, pin: 'A' }, '#38a169');
          canvas.netlist.addWire({ compId: led.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(A0);
  int outputValue = map(sensorValue, 0, 1023, 0, 255);
  analogWrite(9, outputValue);
  Serial.print("Pot: ");
  Serial.print(sensorValue);
  Serial.print(" -> PWM: ");
  Serial.println(outputValue);
  delay(100);
}`;
          break;
        }

        case 'pir_alarm': {
          desc = 'PIR Motion Alarm & Buzzer';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const pir = canvas.addComponent('wokwi-pir-motion-sensor', 380, 70);
          const bz = canvas.addComponent('wokwi-buzzer', 500, 180);

          canvas.netlist.addWire({ compId: pir.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: pir.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.netlist.addWire({ compId: pir.id, pin: 'OUT' }, { compId: uno.id, pin: '2' }, '#38a169');

          canvas.netlist.addWire({ compId: bz.id, pin: '1' }, { compId: uno.id, pin: '8' }, '#805ad5');
          canvas.netlist.addWire({ compId: bz.id, pin: '2' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `void setup() {
  pinMode(2, INPUT);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
  Serial.println("PIR Motion Alarm Armed");
}

void loop() {
  int motion = digitalRead(2);
  if (motion == HIGH) {
    Serial.println("MOTION DETECTED!");
    tone(8, 1000, 200);
    delay(300);
  } else {
    noTone(8);
  }
  delay(200);
}`;
          break;
        }

        case 'franzininho': {
          desc = 'ESP32 Franzininho WiFi (Built-in LEDs)';
          const board = canvas.addComponent('board-franzininho-wifi', 220, 100);
          code = `// ESP32 Franzininho WiFi Built-in LEDs
// Pin 33: Orange LED, Pin 21: Blue LED
const int LED_ORANGE = 33;
const int LED_BLUE = 21;

void setup() {
  Serial.begin(115200);
  pinMode(LED_ORANGE, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  Serial.println("Franzininho WiFi Started!");
}

void loop() {
  digitalWrite(LED_ORANGE, HIGH);
  digitalWrite(LED_BLUE, LOW);
  Serial.println("Orange LED ON, Blue LED OFF");
  delay(500);

  digitalWrite(LED_ORANGE, LOW);
  digitalWrite(LED_BLUE, HIGH);
  Serial.println("Orange LED OFF, Blue LED ON");
  delay(500);
}`;
          break;
        }

        case 'grove_oled': {
          desc = 'Grove SH1107 128x128 I2C OLED Display';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const oled = canvas.addComponent('board-grove-oled-sh1107', 400, 80);

          canvas.netlist.addWire({ compId: oled.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: oled.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: oled.id, pin: 'SDA' }, { compId: uno.id, pin: 'A4' }, '#3182ce');
          canvas.netlist.addWire({ compId: oled.id, pin: 'SCL' }, { compId: uno.id, pin: 'A5' }, '#3182ce');
          canvas.renderWires();

          code = `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 128
#define OLED_RESET -1

Adafruit_SH1107 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(9600);
  delay(250);
  display.begin(0x3C, true);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("IrieBlocky OLED");
  display.println("Grove SH1107 128x128");
  display.display();
  Serial.println("Grove OLED Ready!");
}

void loop() {
  Serial.println("OLED Active");
  delay(2000);
}`;
          break;
        }

        case 'relay_module': {
          desc = '5V Relay Module Switching Control';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const relay = canvas.addComponent('wokwi-relay-module', 400, 80);

          canvas.netlist.addWire({ compId: relay.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: relay.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: relay.id, pin: 'IN' }, { compId: uno.id, pin: '8' }, '#805ad5');
          canvas.renderWires();

          code = `// 5V Relay Module Switching Control
const int RELAY_PIN = 8;

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  Serial.println("Relay Module Initialized");
}

void loop() {
  Serial.println("Relay Energized -> Normally Open (NO) Closed");
  digitalWrite(RELAY_PIN, HIGH);
  delay(2000);

  Serial.println("Relay De-energized -> Normally Closed (NC) Closed");
  digitalWrite(RELAY_PIN, LOW);
  delay(2000);
}`;
          break;
        }

        case 'neopixel_ring': {
          desc = 'NeoPixel 16-LED Ring Sweep';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const ring = canvas.addComponent('wokwi-led-ring', 420, 80, { pixels: 16 });

          canvas.netlist.addWire({ compId: ring.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: ring.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: ring.id, pin: 'DIN' }, { compId: uno.id, pin: '6' }, '#38a169');
          canvas.renderWires();

          code = `#include <Adafruit_NeoPixel.h>

#define PIN        6
#define NUMPIXELS 16

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  Serial.begin(9600);
  pixels.begin();
  pixels.setBrightness(50);
  Serial.println("NeoPixel 16-LED Ring Ready");
}

void loop() {
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(0, 150, 255));
    pixels.show();
    delay(100);
  }
  for (int i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.Color(255, 0, 100));
    pixels.show();
    delay(100);
  }
}`;
          break;
        }

        case 'button_input': {
          desc = 'Pushbutton Input -> LED Output';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const btn = canvas.addComponent('wokwi-pushbutton', 380, 70);
          const res = canvas.addComponent('wokwi-resistor', 480, 180, { value: 220 });
          const led = canvas.addComponent('wokwi-led', 560, 180, { color: 'red' });

          canvas.netlist.addWire({ compId: btn.id, pin: '1.l' }, { compId: uno.id, pin: '2' }, '#38a169');
          canvas.netlist.addWire({ compId: btn.id, pin: '2.l' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: uno.id, pin: '13' }, { compId: res.id, pin: '1' }, '#805ad5');
          canvas.netlist.addWire({ compId: res.id, pin: '2' }, { compId: led.id, pin: 'A' }, '#805ad5');
          canvas.netlist.addWire({ compId: led.id, pin: 'C' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.renderWires();

          code = `const int buttonPin = 2;
const int ledPin = 13;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP); // Button connects pin 2 to GND when pressed
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int pressed = digitalRead(buttonPin) == LOW; // LOW means pressed
  digitalWrite(ledPin, pressed ? HIGH : LOW);
}`;
          break;
        }

        case 'random_logic': {
          desc = 'Random Logic: 3-LED Light Chaser';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const r1 = canvas.addComponent('wokwi-resistor', 400, 110, { value: 220 });
          const r2 = canvas.addComponent('wokwi-resistor', 400, 150, { value: 220 });
          const r3 = canvas.addComponent('wokwi-resistor', 400, 190, { value: 220 });
          const d1 = canvas.addComponent('wokwi-led', 480, 110, { color: 'red' });
          const d2 = canvas.addComponent('wokwi-led', 480, 150, { color: 'gold' });
          const d3 = canvas.addComponent('wokwi-led', 480, 190, { color: 'blue' });

          canvas.netlist.addWire({ compId: uno.id, pin: '2' }, { compId: r1.id, pin: '1' }, '#e53e3e');
          canvas.netlist.addWire({ compId: uno.id, pin: '3' }, { compId: r2.id, pin: '1' }, '#d69e2e');
          canvas.netlist.addWire({ compId: uno.id, pin: '4' }, { compId: r3.id, pin: '1' }, '#3182ce');
          canvas.netlist.addWire({ compId: r1.id, pin: '2' }, { compId: d1.id, pin: 'A' }, '#e53e3e');
          canvas.netlist.addWire({ compId: r2.id, pin: '2' }, { compId: d2.id, pin: 'A' }, '#d69e2e');
          canvas.netlist.addWire({ compId: r3.id, pin: '2' }, { compId: d3.id, pin: 'A' }, '#3182ce');
          canvas.netlist.addWire({ compId: d1.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: d2.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: d3.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `const int ledPins[3] = {2, 3, 4};

void setup() {
  randomSeed(analogRead(A0)); // Unconnected pin noise seeds the randomizer
  for (int i = 0; i < 3; i++) {
    pinMode(ledPins[i], OUTPUT);
  }
}

void loop() {
  int choice = random(0, 3); // random(min, max) -> 0, 1, or 2
  digitalWrite(ledPins[choice], HIGH);
  delay(200);
  digitalWrite(ledPins[choice], LOW);
  delay(100);
}`;
          break;
        }

        case 'buzzer_melody': {
          desc = 'Buzzer Melody Player';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const bz = canvas.addComponent('wokwi-buzzer', 420, 150);

          canvas.netlist.addWire({ compId: uno.id, pin: '8' }, { compId: bz.id, pin: '1' }, '#805ad5');
          canvas.netlist.addWire({ compId: bz.id, pin: '2' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `const int buzzerPin = 8;

// A tiny slice of "Twinkle Twinkle Little Star"
int melody[] = { 262, 262, 392, 392, 440, 440, 392 };
int noteDurations[] = { 400, 400, 400, 400, 400, 400, 800 };

void setup() {
  // Nothing to configure - tone() drives the pin directly.
}

void loop() {
  for (int i = 0; i < 7; i++) {
    tone(buzzerPin, melody[i], noteDurations[i]);
    delay(noteDurations[i] * 1.3); // Gap so notes don't blur together
  }
  noTone(buzzerPin);
  delay(1500);
}`;
          break;
        }

        case 'joystick_demo': {
          desc = 'Analog Joystick X/Y + Click Reader';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const joy = canvas.addComponent('wokwi-analog-joystick', 400, 90);

          canvas.netlist.addWire({ compId: joy.id, pin: 'VCC' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: joy.id, pin: 'GND' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: joy.id, pin: 'VERT' }, { compId: uno.id, pin: 'A0' }, '#3182ce');
          canvas.netlist.addWire({ compId: joy.id, pin: 'HORZ' }, { compId: uno.id, pin: 'A1' }, '#805ad5');
          canvas.netlist.addWire({ compId: joy.id, pin: 'SEL' }, { compId: uno.id, pin: '2' }, '#38a169');
          canvas.renderWires();

          code = `const int vertPin = A0;
const int horzPin = A1;
const int selPin = 2;

void setup() {
  pinMode(selPin, INPUT_PULLUP); // Click connects SEL to GND
  Serial.begin(9600);
}

void loop() {
  int x = analogRead(horzPin);
  int y = analogRead(vertPin);
  bool clicked = digitalRead(selPin) == LOW;

  Serial.print("X: "); Serial.print(x);
  Serial.print("  Y: "); Serial.print(y);
  Serial.print("  Click: "); Serial.println(clicked ? "YES" : "no");
  delay(200);
}`;
          break;
        }

        case 'reaction_game': {
          desc = 'Reaction Time Game';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const res = canvas.addComponent('wokwi-resistor', 420, 110, { value: 220 });
          const led = canvas.addComponent('wokwi-led', 500, 110, { color: 'red' });
          const btn = canvas.addComponent('wokwi-pushbutton', 420, 200);

          canvas.netlist.addWire({ compId: uno.id, pin: '13' }, { compId: res.id, pin: '1' }, '#805ad5');
          canvas.netlist.addWire({ compId: res.id, pin: '2' }, { compId: led.id, pin: 'A' }, '#805ad5');
          canvas.netlist.addWire({ compId: led.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: btn.id, pin: '1.l' }, { compId: uno.id, pin: '2' }, '#38a169');
          canvas.netlist.addWire({ compId: btn.id, pin: '2.l' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.renderWires();

          code = `const int ledPin = 13;
const int buttonPin = 2;

void setup() {
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);
  Serial.begin(9600);
  randomSeed(analogRead(A0));
}

void loop() {
  Serial.println("Get ready...");
  delay(random(1500, 4000)); // Random wait so you can't cheat!

  digitalWrite(ledPin, HIGH);
  Serial.println("GO! Press the button!");
  unsigned long startTime = millis();

  while (digitalRead(buttonPin) == HIGH) {
    // Wait for the press
  }

  unsigned long reactionTime = millis() - startTime;
  digitalWrite(ledPin, LOW);
  Serial.print("Reaction time: ");
  Serial.print(reactionTime);
  Serial.println(" ms");
  delay(2000);
}`;
          break;
        }

        case 'lcd_led': {
          desc = '16x2 LCD Display + Status LED';
          const uno = canvas.addComponent('wokwi-arduino-uno', 50, 60);
          const lcd = canvas.addComponent('wokwi-lcd1602', 380, 60);
          const res = canvas.addComponent('wokwi-resistor', 580, 220, { value: 220 });
          const led = canvas.addComponent('wokwi-led', 660, 220, { color: 'blue' });

          canvas.netlist.addWire({ compId: lcd.id, pin: 'VSS' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'VDD' }, { compId: uno.id, pin: '5V' }, '#e53e3e');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'V0' }, { compId: uno.id, pin: 'GND.2' }, '#1a202c');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'RS' }, { compId: uno.id, pin: '7' }, '#805ad5');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'RW' }, { compId: uno.id, pin: 'GND.3' }, '#1a202c');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'E' }, { compId: uno.id, pin: '8' }, '#805ad5');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'D4' }, { compId: uno.id, pin: '9' }, '#38a169');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'D5' }, { compId: uno.id, pin: '10' }, '#38a169');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'D6' }, { compId: uno.id, pin: '11' }, '#38a169');
          canvas.netlist.addWire({ compId: lcd.id, pin: 'D7' }, { compId: uno.id, pin: '12' }, '#38a169');
          canvas.netlist.addWire({ compId: uno.id, pin: '13' }, { compId: res.id, pin: '1' }, '#d69e2e');
          canvas.netlist.addWire({ compId: res.id, pin: '2' }, { compId: led.id, pin: 'A' }, '#d69e2e');
          canvas.netlist.addWire({ compId: led.id, pin: 'C' }, { compId: uno.id, pin: 'GND.1' }, '#1a202c');
          canvas.renderWires();

          code = `#include <LiquidCrystal.h>

// LiquidCrystal(RS, E, D4, D5, D6, D7)
LiquidCrystal lcd(7, 8, 9, 10, 11, 12);
const int ledPin = 13;
int counter = 0;

void setup() {
  lcd.begin(16, 2);
  lcd.print("IrieBlocky LCD");
  pinMode(ledPin, OUTPUT);
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print("Count: ");
  lcd.print(counter);
  lcd.print("   "); // Clears leftover digits

  digitalWrite(ledPin, HIGH);
  delay(500);
  digitalWrite(ledPin, LOW);
  delay(500);

  counter++;
}`;
          break;
        }

        case 'blink':
        default: {
          desc = 'Classic Pin 13 LED Blink';
          canvas.loadDefaultCircuit();
          code = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`;
          break;
        }
      }

      // Update Live C++ View & Import C++ tab
      const codeOutput = document.getElementById('codeOutput');
      if (codeOutput) codeOutput.textContent = code;

      const cppInput = document.getElementById('cppInput');
      if (cppInput) cppInput.value = code;

      // Convert C++ into Blockly blocks
      try {
        if (window.CppParser && workspace) {
          const parsed = CppParser.parse(code);
          CppParser.applyToWorkspace(parsed, workspace);
          this.updateBlockCount();
        }
      } catch (e) {
        console.warn('Block parsing fallback:', e);
      }

      // Close dropdown if open
      const drop = document.getElementById('examplesDropdownMenu');
      if (drop) drop.style.display = 'none';

      // Switch to Live C++ Code tab
      switchTab('codeTab', document.querySelector('.panel-tabs .tab-btn'));

      this.showStatus(`Loaded "${desc}" sample project! Click "Run" to simulate.`, 'success', 3500);
    }
  };
})();

// Global shortcut helpers for HTML button triggers
function generateCode() { ArduinoBlockly.generateCode(false); }
function clearWorkspace() { ArduinoBlockly.clearWorkspace(); }
function saveWorkspace() { ArduinoBlockly.saveWorkspace(); }
function loadWorkspace() { ArduinoBlockly.loadWorkspace(); }
function debugBlocks() { ArduinoBlockly.debugBlocks(); }
function validateCode() { ArduinoBlockly.validateCode(); }
function loadFromCpp() { ArduinoBlockly.loadFromCpp(); }
function copyCode() { ArduinoBlockly.copyCode(); }
function exportIno() { ArduinoBlockly.exportIno(); }
function startSimulation() { ArduinoBlockly.startSimulation(); }
function stopSimulation() { ArduinoBlockly.stopSimulation(); }
function toggleSimulation() { ArduinoBlockly.toggleSimulation(); }
function clearSerialOutput() { ArduinoBlockly.clearSerialOutput(); }
function sendSerialData() { ArduinoBlockly.sendSerialData(); }
function loadSampleProject(id) { ArduinoBlockly.loadSampleProject(id); }

function toggleExamplesDropdown(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('examplesDropdownMenu');
  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
}

// Close dropdown on click outside
window.addEventListener('click', function(e) {
  const menu = document.getElementById('examplesDropdownMenu');
  if (menu && !e.target.closest('.dropdown')) {
    menu.style.display = 'none';
  }
});

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  ArduinoBlockly.initializeWorkspace();
  ArduinoBlockly.initSimulation();

  // Keyboard shortcut: F5 or Ctrl+Enter to Run/Stop simulation
  window.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'Enter') || e.key === 'F5') {
      e.preventDefault();
      ArduinoBlockly.toggleSimulation();
    }
  });

  // Enter key inside Serial input field to send
  const serialInput = document.getElementById('serialInputText');
  if (serialInput) {
    serialInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        ArduinoBlockly.sendSerialData();
      }
    });
  }
});

// Window resize handler
window.addEventListener('resize', function() {
  const ws = ArduinoBlockly.getWorkspace();
  if (ws) {
    Blockly.svgResize(ws);
  }
});

