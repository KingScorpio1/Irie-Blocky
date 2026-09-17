// js/command_palette.js — Lightning-Fast Quick Search & Action Command Palette
// Trigger with Ctrl+K, Cmd+K, or '/' to search parts, actions, and projects in 2 keystrokes.

class CommandPalette {
  constructor() {
    this.modal = null;
    this.input = null;
    this.resultsList = null;
    this.selectedIndex = 0;
    this.filteredItems = [];

    this.items = this.buildRegistry();
    this.initUi();
    this.bindShortcuts();
  }

  buildRegistry() {
    return [
      // 1. Core Actions
      { id: 'act-run', type: 'Action', title: 'Start Simulation', desc: 'Run sketch and simulate circuit', shortcut: 'F5', run: () => window.startSimulation && window.startSimulation() },
      { id: 'act-stop', type: 'Action', title: 'Stop Simulation', desc: 'Halt active simulation', shortcut: 'Shift+F5', run: () => window.stopSimulation && window.stopSimulation() },
      { id: 'act-multimeter', type: 'Action', title: 'Toggle Multimeter Probe', desc: 'Inspect live node voltages and currents', shortcut: 'M', run: () => window.multimeterProbe && window.multimeterProbe.toggle() },
      { id: 'act-grid', type: 'Action', title: 'Toggle Grid Overlay', desc: 'Show or hide coordinate grid', shortcut: 'G', run: () => window.circuitCanvas && window.circuitCanvas.toggleGrid() },
      { id: 'act-neat-wire', type: 'Action', title: 'Set Wire Style: Neat 90° Orthogonal', desc: 'Clean Manhattan wiring with rounded corners', run: () => window.circuitCanvas && window.circuitCanvas.setWireRoutingMode('orthogonal') },
      { id: 'act-curved-wire', type: 'Action', title: 'Set Wire Style: Curved Bezier', desc: 'Free-form curved wiring', run: () => window.circuitCanvas && window.circuitCanvas.setWireRoutingMode('curved') },
      { id: 'act-view-schematic', type: 'Action', title: 'Switch to Schematic View', desc: 'View IEEE standard electronic schematic', run: () => window.setViewMode && window.setViewMode('schematic') },
      { id: 'act-view-bom', type: 'Action', title: 'Switch to Component List (BOM)', desc: 'View categorized Bill of Materials', run: () => window.setViewMode && window.setViewMode('bom') },
      { id: 'act-view-workbench', type: 'Action', title: 'Switch to Workbench (Split View)', desc: 'Combined Circuit + Blockly workspace', run: () => window.setViewMode && window.setViewMode('workbench') },
      { id: 'act-view-circuit', type: 'Action', title: 'Switch to Full Circuit View', desc: 'Full-screen canvas diagram editor', run: () => window.setViewMode && window.setViewMode('circuit') },
      { id: 'act-export-ino', type: 'Action', title: 'Download .INO Sketch', desc: 'Export C++ file for Arduino IDE', run: () => window.exportIno && window.exportIno() },
      { id: 'act-copy-code', type: 'Action', title: 'Copy Arduino C++ Code', desc: 'Copy sketch to clipboard', run: () => window.copyCode && window.copyCode() },
      { id: 'act-reset-circuit', type: 'Action', title: 'Reset Circuit to Default', desc: 'Restore standard Arduino Uno blink wiring', run: () => window.resetCircuit && window.resetCircuit() },
      { id: 'act-export-pdf', type: 'Action', title: 'Export Schematic PDF', desc: 'Generate printable vector schematic PDF', run: () => window.exportSchematicPdf && window.exportSchematicPdf() },
      { id: 'act-export-svg', type: 'Action', title: 'Export Schematic SVG', desc: 'Lossless vector graphic export', run: () => window.exportSchematicSvg && window.exportSchematicSvg() },
      { id: 'act-export-bom', type: 'Action', title: 'Export BOM CSV', desc: 'Download parts spreadsheet', run: () => window.exportBomCsv && window.exportBomCsv() },

      // 2. Hardware Components
      { id: 'part-uno', type: 'Component', title: 'Arduino Uno R3', desc: 'Classic ATmega328P microcontroller board', run: () => this.addPart('wokwi-arduino-uno') },
      { id: 'part-pico', type: 'Component', title: 'Raspberry Pi Pico (RP2040)', desc: 'Dual-core ARM Cortex-M0+ microcontroller', run: () => this.addPart('wokwi-pi-pico') },
      { id: 'part-stm32', type: 'Component', title: 'STM32 Blue Pill (STM32F103C8)', desc: '72MHz ARM Cortex-M3 32-bit MCU', run: () => this.addPart('board-stm32-bluepill') },
      { id: 'part-franzininho', type: 'Component', title: 'ESP32 Franzininho WiFi', desc: 'ESP32-S2 development board with dual LEDs', run: () => this.addPart('board-franzininho-wifi') },
      { id: 'part-led', type: 'Component', title: 'LED (5mm)', desc: 'Single indicator LED (Red, Green, Blue, etc.)', run: () => this.addPart('wokwi-led') },
      { id: 'part-resistor', type: 'Component', title: 'Resistor', desc: 'Through-hole resistor with EIA color bands', run: () => this.addPart('wokwi-resistor') },
      { id: 'part-bmp180', type: 'Component', title: 'BMP180 Barometric Pressure & Temp', desc: 'I2C digital barometer and altimeter (GY-68)', run: () => this.addPart('board-bmp180') },
      { id: 'part-mfrc522', type: 'Component', title: 'MFRC522 RFID / NFC Reader', desc: '13.56 MHz SPI MIFARE card reader', run: () => this.addPart('board-mfrc522') },
      { id: 'part-relay', type: 'Component', title: 'Relay Module (5V Single Channel)', desc: 'Electromagnetic SPDT relay switch', run: () => this.addPart('wokwi-relay-module') },
      { id: 'part-neopixel', type: 'Component', title: 'NeoPixel RGB Ring (16 LEDs)', desc: 'Addressable WS2812B circular LED strip', run: () => this.addPart('wokwi-neopixel') },
      { id: 'part-ssd1306', type: 'Component', title: 'SSD1306 0.96" OLED Display', desc: '128x64 monochrome graphic I2C screen', run: () => this.addPart('board-ssd1306') },
      { id: 'part-grove-oled', type: 'Component', title: 'Grove SH1107 OLED (128x128)', desc: 'High-res graphic display with Grove header', run: () => this.addPart('board-grove-oled-sh1107') },
      { id: 'part-servo', type: 'Component', title: 'Micro Servo Motor (SG90)', desc: '0-180 degree positional PWM servo motor', run: () => this.addPart('wokwi-servo') },
      { id: 'part-pushbutton', type: 'Component', title: 'Pushbutton Switch', desc: 'Momentary tactile pushbutton (12mm)', run: () => this.addPart('wokwi-pushbutton') },
      { id: 'part-pot', type: 'Component', title: 'Rotary Potentiometer (10k)', desc: 'Analog dial voltage divider', run: () => this.addPart('wokwi-potentiometer') },
      { id: 'part-buzzer', type: 'Component', title: 'Piezo Buzzer / Speaker', desc: 'Audio tone and square wave sounder', run: () => this.addPart('wokwi-buzzer') },
      { id: 'part-hcsr04', type: 'Component', title: 'HC-SR04 Ultrasonic Distance Sensor', desc: 'Sonar pulse ranger (2cm - 400cm)', run: () => this.addPart('wokwi-hc-sr04') },
      { id: 'part-dht22', type: 'Component', title: 'DHT22 Temperature & Humidity', desc: 'Digital relative humidity & temp sensor', run: () => this.addPart('wokwi-dht22') },
      { id: 'part-pir', type: 'Component', title: 'PIR Motion Sensor', desc: 'Infrared human motion detector', run: () => this.addPart('wokwi-pir-motion-sensor') },

      // 3. Starter Projects
      { id: 'proj-blink', type: 'Sample Project', title: 'Blink (LED on Pin 13)', desc: 'The "Hello World" of microcontrollers', run: () => window.loadSampleProject && window.loadSampleProject('blink') },
      { id: 'proj-franzininho', type: 'Sample Project', title: 'ESP32 Franzininho Dual LED', desc: 'Alternate blink on GPIO 33 and GPIO 21', run: () => window.loadSampleProject && window.loadSampleProject('franzininho') },
      { id: 'proj-grove-oled', type: 'Sample Project', title: 'SH1107 128x128 OLED Demo', desc: 'I2C display initialization and graphics', run: () => window.loadSampleProject && window.loadSampleProject('grove_oled') },
      { id: 'proj-relay', type: 'Sample Project', title: '5V Relay Module Switching', desc: 'Drive high-current circuits on Pin 8', run: () => window.loadSampleProject && window.loadSampleProject('relay_module') },
      { id: 'proj-neopixel', type: 'Sample Project', title: 'NeoPixel 16-LED Ring Sweep', desc: 'Colorful RGB light runner on Pin 6', run: () => window.loadSampleProject && window.loadSampleProject('neopixel_ring') },
      { id: 'proj-bmp180', type: 'Sample Project', title: 'BMP180 Barometer & Altitude', desc: 'Read atmospheric pressure and altitude', run: () => window.loadSampleProject && window.loadSampleProject('bmp180') },
      { id: 'proj-mfrc522', type: 'Sample Project', title: 'MFRC522 RFID Card Reader', desc: 'Scan and verify 13.56 MHz RFID cards', run: () => window.loadSampleProject && window.loadSampleProject('mfrc522') },
      { id: 'proj-servo', type: 'Sample Project', title: 'Servo Motor 180° Sweep', desc: 'Smooth back-and-forth servo movement', run: () => window.loadSampleProject && window.loadSampleProject('servo_sweep') }
    ];
  }

  addPart(type) {
    if (window.circuitCanvas) {
      window.circuitCanvas.addComponent(type, 260, 140);
    }
  }

  initUi() {
    let modal = document.getElementById('commandPaletteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'commandPaletteModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 12vh;
        z-index: 15000;
        backdrop-filter: blur(6px);
      `;
      document.body.appendChild(modal);
    }
    this.modal = modal;

    modal.innerHTML = `
      <div style="background:#ffffff; width:580px; max-width:92vw; border-radius:12px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.35); overflow:hidden; border:1px solid #cbd5e1; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; padding:12px 16px; border-bottom:1px solid #e2e8f0; background:#f8fafc; gap:10px;">
          <span style="font-size:1.1rem; color:#64748b;">&#x1F50D;</span>
          <input type="text" id="commandPaletteInput" placeholder="Type a component, action, or sample project... (Esc to close)" style="flex:1; border:none; background:transparent; font-size:1rem; outline:none; color:#1e293b; font-family:inherit;">
          <span style="font-size:0.7rem; background:#e2e8f0; color:#475569; padding:2px 6px; border-radius:4px; font-weight:700;">ESC</span>
        </div>
        <div id="commandPaletteResults" style="max-height:380px; overflow-y:auto; padding:6px 0;"></div>
        <div style="padding:8px 16px; background:#f1f5f9; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:0.72rem; color:#64748b;">
          <span>Navigation: <kbd style="background:#e2e8f0; padding:1px 4px; border-radius:3px;">&uarr;</kbd> <kbd style="background:#e2e8f0; padding:1px 4px; border-radius:3px;">&darr;</kbd> to navigate</span>
          <span>Select: <kbd style="background:#e2e8f0; padding:1px 4px; border-radius:3px;">Enter</kbd></span>
        </div>
      </div>
    `;

    this.input = document.getElementById('commandPaletteInput');
    this.resultsList = document.getElementById('commandPaletteResults');

    modal.onclick = (e) => {
      if (e.target === modal) this.close();
    };

    this.input.oninput = (e) => {
      this.filter(e.target.value);
    };

    this.input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % (this.filteredItems.length || 1);
        this.renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % (this.filteredItems.length || 1);
        this.renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === 'Escape') {
        this.close();
      }
    };
  }

  bindShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        this.open();
      }
      // '/' when not inside input
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.open();
      }
    });
  }

  open() {
    this.filteredItems = [...this.items];
    this.selectedIndex = 0;
    this.modal.style.display = 'flex';
    this.input.value = '';
    this.renderResults();
    setTimeout(() => this.input.focus(), 50);
  }

  close() {
    this.modal.style.display = 'none';
  }

  filter(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      this.filteredItems = [...this.items];
    } else {
      this.filteredItems = this.items.filter(item => {
        return item.title.toLowerCase().includes(q) ||
               item.desc.toLowerCase().includes(q) ||
               item.type.toLowerCase().includes(q) ||
               item.id.toLowerCase().includes(q);
      });
    }
    this.selectedIndex = 0;
    this.renderResults();
  }

  renderResults() {
    if (this.filteredItems.length === 0) {
      this.resultsList.innerHTML = `
        <div style="padding:24px 16px; text-align:center; color:#94a3b8; font-size:0.85rem;">
          No matching components, actions, or projects found.
        </div>
      `;
      return;
    }

    this.resultsList.innerHTML = this.filteredItems.map((item, idx) => {
      const isSel = idx === this.selectedIndex;
      const typeBg = item.type === 'Component' ? '#e0f2fe' : item.type === 'Action' ? '#fef3c7' : '#dcfce7';
      const typeColor = item.type === 'Component' ? '#0369a1' : item.type === 'Action' ? '#b45309' : '#15803d';

      return `
        <div class="cmd-item" data-index="${idx}" onclick="commandPalette.selectAndRun(${idx})" style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:8px 16px;
          cursor:pointer;
          background:${isSel ? '#f1f5f9' : 'transparent'};
          border-left:3px solid ${isSel ? '#00979d' : 'transparent'};
        ">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; background:${typeBg}; color:${typeColor}; padding:2px 6px; border-radius:4px;">${item.type}</span>
            <div>
              <div style="font-size:0.85rem; font-weight:600; color:#1e293b;">${item.title}</div>
              <div style="font-size:0.72rem; color:#64748b;">${item.desc}</div>
            </div>
          </div>
          ${item.shortcut ? `<span style="font-size:0.68rem; font-family:monospace; background:#e2e8f0; color:#475569; padding:2px 6px; border-radius:4px; font-weight:700;">${item.shortcut}</span>` : ''}
        </div>
      `;
    }).join('');

    // Ensure selected element is scrolled into view
    const selEl = this.resultsList.querySelector(`[data-index="${this.selectedIndex}"]`);
    if (selEl) {
      selEl.scrollIntoView({ block: 'nearest' });
    }
  }

  selectAndRun(idx) {
    this.selectedIndex = idx;
    this.executeSelected();
  }

  executeSelected() {
    const item = this.filteredItems[this.selectedIndex];
    if (item && typeof item.run === 'function') {
      this.close();
      item.run();
    }
  }
}

// Instantiate global CommandPalette
window.commandPalette = new CommandPalette();
window.CommandPalette = CommandPalette;
