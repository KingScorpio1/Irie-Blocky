// js/circuit_canvas.js — Interactive Circuit Canvas & Wokwi Elements Workbench for IrieBlocky
// Provides: Complete Wokwi Interactive Diagram Editor Parity
// Features: Part manipulation (rotate, duplicate, nudge, multi-select, delete),
//           Wiring with bend points, auto-wire coloring, wire color shortcuts (0-9, c, l, m, p, y),
//           Double-click wire delete, grid toggle (G), cursor-centered zoom & fit (+/-/F),
//           Add Part modal (A), BMP180 slider controls, MFRC522 card selector controls.

class CircuitCanvas {
  constructor(boardId, svgId) {
    this.board = document.getElementById(boardId);
    this.svg = document.getElementById(svgId);
    this.netlist = new CircuitNetlist();

    // Viewport & Pan/Zoom
    this.viewport = this.initViewport();
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.gridEnabled = true;
    this.gridSize = 10; // 10px (~2.54mm) grid spacing

    // Selection Sets (supports multi-selection)
    this.selectedComponents = new Set();
    this.selectedWires = new Set();

    // Wire Drawing State
    this.activeWireColor = '#38a169'; // default green
    this.drawingWireColor = '#38a169';
    this.isDrawingWire = false;
    this.wireStart = null; // { compId, pin, absX, absY }
    this.wireBendPoints = []; // Array<{ x, y }>
    this.previewWire = null;
    this.wireRoutingMode = 'orthogonal'; // 'orthogonal' (Neat 90-degree) or 'curved' (Bezier)

    // Mouse Dragging & Panning State
    this.isDraggingComp = false;
    this.dragStartMouse = { x: 0, y: 0 };
    this.dragStartPositions = new Map(); // compId -> { x, y }

    this.isPanning = false;
    this.panStartMouse = { x: 0, y: 0 };
    this.panStart = { x: 0, y: 0 };

    // Wire Color Palette Definitions (Wokwi Standard)
    this.wireColorMap = {
      '0': { name: 'Black', hex: '#1a202c' },
      '1': { name: 'Brown', hex: '#8b4513' },
      '2': { name: 'Red', hex: '#e53e3e' },
      '3': { name: 'Orange', hex: '#dd6b20' },
      '4': { name: 'Gold', hex: '#d4af37' },
      '5': { name: 'Green', hex: '#38a169' },
      '6': { name: 'Blue', hex: '#3182ce' },
      '7': { name: 'Violet', hex: '#805ad5' },
      '8': { name: 'Gray', hex: '#808080' },
      '9': { name: 'White', hex: '#ffffff' },
      'c': { name: 'Cyan', hex: '#00ffff' },
      'l': { name: 'Lime', hex: '#32cd32' },
      'm': { name: 'Magenta', hex: '#ff00ff' },
      'p': { name: 'Purple', hex: '#800080' },
      'y': { name: 'Yellow', hex: '#d69e2e' }
    };

    // Pin definitions table for fallback
    this.pinMap = this.initPinMap();

    // Initialize Component Catalog for Add Part Modal
    this.catalog = this.initCatalog();

    this.initEventListeners();
    this.updateViewportTransform();
  }

  // Backward compatibility getters/setters for legacy code
  get selectedComponent() {
    return this.selectedComponents.values().next().value || null;
  }
  set selectedComponent(comp) {
    this.selectedComponents.clear();
    if (comp) this.selectedComponents.add(comp);
  }

  get selectedWire() {
    return this.selectedWires.values().next().value || null;
  }
  set selectedWire(wire) {
    this.selectedWires.clear();
    if (wire) this.selectedWires.add(wire);
  }

  initViewport() {
    let vp = document.getElementById('circuitViewport');
    if (!vp && this.board) {
      vp = document.createElement('div');
      vp.id = 'circuitViewport';
      vp.className = 'circuit-viewport';

      // Move existing SVG into viewport if needed
      if (this.svg && this.svg.parentNode === this.board) {
        vp.appendChild(this.svg);
      }
      this.board.appendChild(vp);
    }
    return vp || this.board;
  }

  updateViewportTransform() {
    if (!this.viewport) return;
    this.viewport.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
    this.viewport.style.transformOrigin = '0 0';

    if (this.board) {
      // Shift and scale the visual dot grid with the canvas
      this.board.style.backgroundPosition = `${this.pan.x}px ${this.pan.y}px`;
      this.board.style.backgroundSize = `${20 * this.zoom}px ${20 * this.zoom}px`;
    }

    const zoomLabel = document.getElementById('zoomLevelLabel');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  // Pin definitions table
  initPinMap() {
    return {
      'wokwi-arduino-uno': [
        { name: '13', x: 125, y: 9, label: 'Pin 13' },
        { name: '12', x: 134.5, y: 9, label: 'Pin 12' },
        { name: '11', x: 144, y: 9, label: 'Pin 11 (PWM)' },
        { name: '10', x: 153.5, y: 9, label: 'Pin 10 (PWM)' },
        { name: '9', x: 163, y: 9, label: 'Pin 9 (PWM)' },
        { name: '8', x: 172.5, y: 9, label: 'Pin 8' },
        { name: '7', x: 187, y: 9, label: 'Pin 7' },
        { name: '6', x: 196.5, y: 9, label: 'Pin 6 (PWM)' },
        { name: '5', x: 206, y: 9, label: 'Pin 5 (PWM)' },
        { name: '4', x: 215.5, y: 9, label: 'Pin 4' },
        { name: '3', x: 225, y: 9, label: 'Pin 3 (PWM)' },
        { name: '2', x: 234.5, y: 9, label: 'Pin 2' },
        { name: 'TX', x: 244, y: 9, label: 'TX (1)' },
        { name: 'RX', x: 253.5, y: 9, label: 'RX (0)' },
        { name: 'GND.1', x: 115.5, y: 9, label: 'GND' },
        { name: 'AREF', x: 106, y: 9, label: 'AREF' },
        { name: 'IOREF', x: 115.5, y: 200, label: 'IOREF' },
        { name: 'RESET', x: 125, y: 200, label: 'RESET' },
        { name: '3.3V', x: 134.5, y: 200, label: '3.3V' },
        { name: '5V', x: 144, y: 200, label: '5V Power' },
        { name: 'GND.2', x: 153.5, y: 200, label: 'GND' },
        { name: 'GND.3', x: 163, y: 200, label: 'GND' },
        { name: 'VIN', x: 172.5, y: 200, label: 'VIN' },
        { name: 'A0', x: 187, y: 200, label: 'Analog A0' },
        { name: 'A1', x: 196.5, y: 200, label: 'Analog A1' },
        { name: 'A2', x: 206, y: 200, label: 'Analog A2' },
        { name: 'A3', x: 215.5, y: 200, label: 'Analog A3' },
        { name: 'A4', x: 225, y: 200, label: 'Analog A4 (SDA)' },
        { name: 'A5', x: 234.5, y: 200, label: 'Analog A5 (SCL)' }
      ],
      'wokwi-arduino-nano': [
        { name: 'TX', x: 8, y: 15, label: 'TX (1)' },
        { name: 'RX', x: 8, y: 24.5, label: 'RX (0)' },
        { name: 'RST', x: 8, y: 34, label: 'Reset' },
        { name: 'GND.1', x: 8, y: 43.5, label: 'GND' },
        { name: 'D2', x: 8, y: 53, label: 'D2' },
        { name: 'D3', x: 8, y: 62.5, label: 'D3 (PWM)' },
        { name: 'D4', x: 8, y: 72, label: 'D4' },
        { name: 'D5', x: 8, y: 81.5, label: 'D5 (PWM)' },
        { name: 'D6', x: 8, y: 91, label: 'D6 (PWM)' },
        { name: 'D7', x: 8, y: 100.5, label: 'D7' },
        { name: 'D8', x: 8, y: 110, label: 'D8' },
        { name: 'D9', x: 8, y: 119.5, label: 'D9 (PWM)' },
        { name: 'D10', x: 8, y: 129, label: 'D10 (PWM)' },
        { name: 'D11', x: 8, y: 138.5, label: 'D11 (MOSI)' },
        { name: 'D12', x: 8, y: 148, label: 'D12 (MISO)' },
        { name: 'D13', x: 74, y: 15, label: 'D13 (SCK)' },
        { name: '3V3', x: 74, y: 24.5, label: '3.3V' },
        { name: 'REF', x: 74, y: 34, label: 'AREF' },
        { name: 'A0', x: 74, y: 43.5, label: 'A0' },
        { name: 'A1', x: 74, y: 53, label: 'A1' },
        { name: 'A2', x: 74, y: 62.5, label: 'A2' },
        { name: 'A3', x: 74, y: 72, label: 'A3' },
        { name: 'A4', x: 74, y: 81.5, label: 'A4 (SDA)' },
        { name: 'A5', x: 74, y: 91, label: 'A5 (SCL)' },
        { name: 'A6', x: 74, y: 100.5, label: 'A6' },
        { name: 'A7', x: 74, y: 110, label: 'A7' },
        { name: '5V', x: 74, y: 119.5, label: '5V' },
        { name: 'RST.2', x: 74, y: 129, label: 'Reset' },
        { name: 'GND.2', x: 74, y: 138.5, label: 'GND' },
        { name: 'VIN', x: 74, y: 148, label: 'VIN' }
      ],
      'wokwi-arduino-mega': [
        { name: '5V', x: 144, y: 200, label: '5V' },
        { name: 'GND', x: 153.5, y: 200, label: 'GND' },
        { name: 'A0', x: 187, y: 200, label: 'A0' },
        { name: '13', x: 125, y: 9, label: 'Pin 13' }
      ],
      'wokwi-led': [
        { name: 'A', x: 10, y: 38, label: 'Anode (+)' },
        { name: 'C', x: 19, y: 38, label: 'Cathode (-)' }
      ],
      'wokwi-resistor': [
        { name: '1', x: 0, y: 9, label: 'Terminal 1' },
        { name: '2', x: 59, y: 9, label: 'Terminal 2' }
      ],
      'wokwi-pushbutton': [
        { name: '1.l', x: 2, y: 9, label: 'Pin 1' },
        { name: '2.l', x: 2, y: 36, label: 'Pin 2' },
        { name: '1.r', x: 65, y: 9, label: 'Pin 1' },
        { name: '2.r', x: 65, y: 36, label: 'Pin 2' }
      ],
      'wokwi-potentiometer': [
        { name: 'GND', x: 29, y: 68.5, label: 'GND' },
        { name: 'SIG', x: 37, y: 68.5, label: 'SIG (Analog Out)' },
        { name: 'VCC', x: 44.75, y: 68.5, label: 'VCC (5V)' }
      ],
      'wokwi-servo': [
        { name: 'GND', x: 0, y: 50, label: 'GND (Black/Brown)' },
        { name: 'V+', x: 0, y: 59.5, label: 'V+ (Red 5V)' },
        { name: 'PWM', x: 0, y: 69, label: 'PWM (Orange/Signal)' }
      ],
      'wokwi-buzzer': [
        { name: '1', x: 30, y: 82, label: 'Positive / Signal' },
        { name: '2', x: 34, y: 82, label: 'GND' }
      ],
      'wokwi-hc-sr04': [
        { name: 'VCC', x: 71.8, y: 94.5, label: 'VCC (5V)' },
        { name: 'TRIG', x: 79.7, y: 94.5, label: 'Trigger' },
        { name: 'ECHO', x: 87.6, y: 94.5, label: 'Echo' },
        { name: 'GND', x: 95.5, y: 94.5, label: 'GND' }
      ],
      'wokwi-dht22': [
        { name: 'VCC', x: 10, y: 114.9, label: 'VCC (3.3V-5V)' },
        { name: 'SDA', x: 22.4, y: 114.9, label: 'SDA / Data' },
        { name: 'NC', x: 35.3, y: 114.9, label: 'Not Connected' },
        { name: 'GND', x: 48, y: 114.9, label: 'GND' }
      ],
      'board-bmp180': [
        { name: 'VCC', x: 8, y: 15, label: 'VCC (5V)' },
        { name: '3.3V', x: 8, y: 25, label: '3.3V Supply' },
        { name: 'GND', x: 8, y: 35, label: 'GND' },
        { name: 'SCL', x: 8, y: 45, label: 'SCL (I2C Clock)' },
        { name: 'SDA', x: 8, y: 55, label: 'SDA (I2C Data)' }
      ],
      'board-mfrc522': [
        { name: '3.3V', x: 8, y: 15, label: '3.3V' },
        { name: 'RST', x: 8, y: 25, label: 'Reset (RST)' },
        { name: 'GND', x: 8, y: 35, label: 'GND' },
        { name: 'IRQ', x: 8, y: 45, label: 'Interrupt (IRQ)' },
        { name: 'MISO', x: 8, y: 55, label: 'MISO (SPI Data Out)' },
        { name: 'MOSI', x: 8, y: 65, label: 'MOSI (SPI Data In)' },
        { name: 'SCK', x: 8, y: 75, label: 'SCK (SPI Clock)' },
        { name: 'SDA', x: 8, y: 85, label: 'SDA / SS (Chip Select)' }
      ],
      'wokwi-ds1307': [
        { name: 'GND', x: 9.5, y: 15, label: 'GND' },
        { name: '5V', x: 9.5, y: 25, label: 'VCC (5V)' },
        { name: 'SDA', x: 9.5, y: 34.5, label: 'SDA (I2C Data)' },
        { name: 'SCL', x: 9.5, y: 44, label: 'SCL (I2C Clock)' },
        { name: 'SQW', x: 9.5, y: 54, label: 'Square Wave Out' }
      ],
      'wokwi-pir-motion-sensor': [
        { name: 'VCC', x: 36.2, y: 92, label: 'VCC (5V)' },
        { name: 'OUT', x: 45.9, y: 92, label: 'Output (Digital)' },
        { name: 'GND', x: 55.6, y: 92, label: 'GND' }
      ],
      'wokwi-ntc-temperature-sensor': [
        { name: 'GND', x: 135, y: 26.2, label: 'GND' },
        { name: 'VCC', x: 135, y: 35.8, label: 'VCC (5V)' },
        { name: 'OUT', x: 135, y: 45.5, label: 'Analog Output' }
      ],
      'wokwi-photoresistor-sensor': [
        { name: 'VCC', x: 172, y: 16, label: 'VCC (5V)' },
        { name: 'GND', x: 172, y: 26, label: 'GND' },
        { name: 'DO', x: 172, y: 35.8, label: 'Digital Out' },
        { name: 'AO', x: 172, y: 45.5, label: 'Analog Out' }
      ],
      'wokwi-gas-sensor': [
        { name: 'AOUT', x: 137, y: 16.5, label: 'Analog Out' },
        { name: 'DOUT', x: 137, y: 26.4, label: 'Digital Out' },
        { name: 'GND', x: 137, y: 36.5, label: 'GND' },
        { name: 'VCC', x: 137, y: 46.2, label: 'VCC (5V)' }
      ],
      'wokwi-mpu6050': [
        { name: 'VCC', x: 74.4, y: 5.8, label: 'VCC (3.3V-5V)' },
        { name: 'GND', x: 64.8, y: 5.8, label: 'GND' },
        { name: 'SCL', x: 55.2, y: 5.8, label: 'SCL (I2C Clock)' },
        { name: 'SDA', x: 45.6, y: 5.8, label: 'SDA (I2C Data)' },
        { name: 'XDA', x: 36.0, y: 5.8, label: 'Aux Data' },
        { name: 'XCL', x: 26.4, y: 5.8, label: 'Aux Clock' },
        { name: 'AD0', x: 16.9, y: 5.8, label: 'I2C Address Select' },
        { name: 'INT', x: 7.3, y: 5.8, label: 'Interrupt' }
      ],
      'wokwi-hx711': [
        { name: 'GND', x: 7, y: 26.5, label: 'GND' },
        { name: 'DT', x: 7, y: 36.3, label: 'Data (DT)' },
        { name: 'SCK', x: 7, y: 46.2, label: 'Clock (SCK)' },
        { name: 'VCC', x: 7, y: 55, label: 'VCC (5V)' }
      ],
      'wokwi-analog-joystick': [
        { name: 'VCC', x: 33, y: 115.8, label: 'VCC (5V)' },
        { name: 'VERT', x: 42.6, y: 115.8, label: 'Y-Axis (Analog)' },
        { name: 'HORZ', x: 52.2, y: 115.8, label: 'X-Axis (Analog)' },
        { name: 'SEL', x: 61.8, y: 115.8, label: 'Switch / Button' },
        { name: 'GND', x: 71.4, y: 115.8, label: 'GND' }
      ],
      'wokwi-ky-040': [
        { name: 'CLK', x: 116, y: 7.9, label: 'Encoder Clock' },
        { name: 'DT', x: 116, y: 17.4, label: 'Encoder Data' },
        { name: 'SW', x: 116, y: 27, label: 'Push Switch' },
        { name: 'VCC', x: 116, y: 36.3, label: 'VCC (5V)' },
        { name: 'GND', x: 116, y: 45.5, label: 'GND' }
      ],
      'wokwi-slide-switch': [
        { name: '1', x: 6.5, y: 34, label: 'Terminal 1' },
        { name: '2', x: 16, y: 34, label: 'Common' },
        { name: '3', x: 25.5, y: 34, label: 'Terminal 2' }
      ],
      'wokwi-lcd1602': [
        { name: 'VSS', x: 10, y: 15, label: 'GND' },
        { name: 'VDD', x: 10, y: 25, label: 'VCC (5V)' },
        { name: 'V0', x: 10, y: 35, label: 'Contrast' },
        { name: 'RS', x: 10, y: 45, label: 'Register Select' },
        { name: 'RW', x: 10, y: 55, label: 'Read/Write' },
        { name: 'E', x: 10, y: 65, label: 'Enable' },
        { name: 'D4', x: 10, y: 105, label: 'Data 4' },
        { name: 'D5', x: 10, y: 115, label: 'Data 5' },
        { name: 'D6', x: 10, y: 125, label: 'Data 6' },
        { name: 'D7', x: 10, y: 135, label: 'Data 7' }
      ],
      'board-bmp180': [
        { name: 'VCC', x: 10, y: 64, label: 'VCC (3.3V - 5V)' },
        { name: '3.3V', x: 22.5, y: 64, label: '3.3V Supply' },
        { name: 'GND', x: 35, y: 64, label: 'Ground' },
        { name: 'SCL', x: 47.5, y: 64, label: 'I2C Clock' },
        { name: 'SDA', x: 60, y: 64, label: 'I2C Data' }
      ],
      'board-mfrc522': [
        { name: '3.3V', x: 18, y: 154, label: '3.3V Supply' },
        { name: 'RST', x: 31, y: 154, label: 'Reset' },
        { name: 'GND', x: 44, y: 154, label: 'Ground' },
        { name: 'IRQ', x: 57, y: 154, label: 'Interrupt' },
        { name: 'MISO', x: 70, y: 154, label: 'SPI MISO' },
        { name: 'MOSI', x: 83, y: 154, label: 'SPI MOSI' },
        { name: 'SCK', x: 96, y: 154, label: 'SPI Clock' },
        { name: 'SDA', x: 109, y: 154, label: 'SPI SDA / SS' }
      ],
      'wokwi-relay-module': [
        { name: 'NO', x: 12, y: 22, label: 'Normally Open' },
        { name: 'COM', x: 12, y: 46, label: 'Common Terminal' },
        { name: 'NC', x: 12, y: 70, label: 'Normally Closed' },
        { name: 'VCC', x: 108, y: 26, label: 'VCC (5V)' },
        { name: 'IN', x: 108, y: 46, label: 'Control Input' },
        { name: 'GND', x: 108, y: 66, label: 'Ground' }
      ],
      'board-grove-oled-sh1107': [
        { name: 'SCL', x: 30, y: 104, label: 'I2C Clock' },
        { name: 'SDA', x: 46, y: 104, label: 'I2C Data' },
        { name: 'VCC', x: 62, y: 104, label: 'VCC (3.3V - 5V)' },
        { name: 'GND', x: 78, y: 104, label: 'Ground' }
      ],
      'wokwi-led-ring': [
        { name: 'VCC', x: 20, y: 20, label: 'VCC (5V)' },
        { name: 'GND', x: 20, y: 40, label: 'Ground' },
        { name: 'DIN', x: 40, y: 20, label: 'Data In' },
        { name: 'DOUT', x: 40, y: 40, label: 'Data Out' }
      ],
      'wokwi-neopixel': [
        { name: 'VDD', x: 6, y: 10, label: 'VDD (5V)' },
        { name: 'DIN', x: 6, y: 20, label: 'Data In' },
        { name: 'VSS', x: 24, y: 10, label: 'GND' },
        { name: 'DOUT', x: 24, y: 20, label: 'Data Out' }
      ],
      'board-ssd1306': [
        { name: 'GND', x: 25, y: 12, label: 'Ground' },
        { name: 'VCC', x: 43, y: 12, label: 'VCC (3.3V - 5V)' },
        { name: 'SCL', x: 61, y: 12, label: 'I2C SCL' },
        { name: 'SDA', x: 79, y: 12, label: 'I2C SDA' }
      ],
      'wokwi-ssd1306': [
        { name: 'GND', x: 25, y: 12, label: 'Ground' },
        { name: 'VCC', x: 43, y: 12, label: 'VCC (3.3V - 5V)' },
        { name: 'SCL', x: 61, y: 12, label: 'I2C SCL' },
        { name: 'SDA', x: 79, y: 12, label: 'I2C SDA' }
      ],
      'board-stm32-bluepill': [
        { name: 'B12', x: 8, y: 30, label: 'PB12' },
        { name: 'B13', x: 8, y: 39.5, label: 'PB13' },
        { name: 'B14', x: 8, y: 49, label: 'PB14' },
        { name: 'B15', x: 8, y: 58.5, label: 'PB15' },
        { name: 'A8', x: 8, y: 68, label: 'PA8' },
        { name: 'A9', x: 8, y: 77.5, label: 'PA9' },
        { name: 'A10', x: 8, y: 87, label: 'PA10' },
        { name: 'A11', x: 8, y: 96.5, label: 'PA11' },
        { name: 'A12', x: 8, y: 106, label: 'PA12' },
        { name: 'A15', x: 8, y: 115.5, label: 'PA15' },
        { name: 'B3', x: 8, y: 125, label: 'PB3' },
        { name: 'B4', x: 8, y: 134.5, label: 'PB4' },
        { name: 'B5', x: 8, y: 144, label: 'PB5' },
        { name: 'B6', x: 8, y: 153.5, label: 'PB6' },
        { name: 'B7', x: 8, y: 163, label: 'PB7' },
        { name: 'B8', x: 8, y: 172.5, label: 'PB8' },
        { name: 'B9', x: 8, y: 182, label: 'PB9' },
        { name: '5V', x: 8, y: 191.5, label: '5V' },
        { name: 'GND.1', x: 8, y: 201, label: 'GND' },
        { name: '3V3.1', x: 8, y: 210.5, label: '3.3V' },
        { name: 'B11', x: 82, y: 30, label: 'PB11' },
        { name: 'B10', x: 82, y: 39.5, label: 'PB10' },
        { name: 'B1', x: 82, y: 49, label: 'PB1' },
        { name: 'B0', x: 82, y: 58.5, label: 'PB0' },
        { name: 'A7', x: 82, y: 68, label: 'PA7' },
        { name: 'A6', x: 82, y: 77.5, label: 'PA6' },
        { name: 'A5', x: 82, y: 87, label: 'PA5' },
        { name: 'A4', x: 82, y: 96.5, label: 'PA4' },
        { name: 'A3', x: 82, y: 106, label: 'PA3' },
        { name: 'A2', x: 82, y: 115.5, label: 'PA2' },
        { name: 'A1', x: 82, y: 125, label: 'PA1' },
        { name: 'A0', x: 82, y: 134.5, label: 'PA0' },
        { name: 'C15', x: 82, y: 144, label: 'PC15' },
        { name: 'C14', x: 82, y: 153.5, label: 'PC14' },
        { name: 'C13', x: 82, y: 163, label: 'PC13 (LED)' },
        { name: 'VBAT', x: 82, y: 172.5, label: 'VBAT' },
        { name: 'RST', x: 82, y: 182, label: 'Reset' },
        { name: '3V3.2', x: 82, y: 191.5, label: '3.3V' },
        { name: 'GND.2', x: 82, y: 201, label: 'GND' },
        { name: 'GND.3', x: 82, y: 210.5, label: 'GND' }
      ],
      'board-st-nucleo-c031c6': [
        { name: 'D13', x: 22, y: 174, label: 'D13 / PA5 (LD4)' },
        { name: 'D12', x: 22, y: 166, label: 'D12' },
        { name: 'D11', x: 22, y: 158, label: 'D11' },
        { name: 'D10', x: 22, y: 150, label: 'D10' },
        { name: 'D9', x: 22, y: 142, label: 'D9' },
        { name: 'D8', x: 22, y: 134, label: 'D8' },
        { name: 'D7', x: 22, y: 126, label: 'D7' },
        { name: 'D6', x: 22, y: 118, label: 'D6' },
        { name: 'D5', x: 22, y: 110, label: 'D5' },
        { name: 'D4', x: 22, y: 102, label: 'D4' },
        { name: 'D3', x: 22, y: 94, label: 'D3' },
        { name: 'D2', x: 22, y: 86, label: 'D2' },
        { name: 'D1', x: 22, y: 78, label: 'D1' },
        { name: 'D0', x: 22, y: 70, label: 'D0' },
        { name: 'A0', x: 118, y: 136, label: 'A0' },
        { name: 'A1', x: 118, y: 144, label: 'A1' },
        { name: 'A2', x: 118, y: 152, label: 'A2' },
        { name: 'A3', x: 118, y: 160, label: 'A3' },
        { name: 'A4', x: 118, y: 168, label: 'A4 (SDA)' },
        { name: 'A5', x: 118, y: 176, label: 'A5 (SCL)' },
        { name: '5V', x: 118, y: 104, label: '5V' },
        { name: '3.3V', x: 118, y: 96, label: '3.3V' },
        { name: 'GND', x: 118, y: 112, label: 'GND' }
      ],
      'board-st-nucleo-l031k6': [
        { name: 'D1', x: 8, y: 35, label: 'D1' },
        { name: 'D0', x: 8, y: 44.5, label: 'D0' },
        { name: 'D2', x: 8, y: 73, label: 'D2' },
        { name: 'D3', x: 8, y: 82.5, label: 'D3' },
        { name: 'D4', x: 8, y: 92, label: 'D4' },
        { name: 'D5', x: 8, y: 101.5, label: 'D5' },
        { name: 'D6', x: 8, y: 111, label: 'D6' },
        { name: 'D7', x: 8, y: 120.5, label: 'D7' },
        { name: 'D8', x: 8, y: 130, label: 'D8' },
        { name: 'D9', x: 8, y: 139.5, label: 'D9' },
        { name: 'D10', x: 8, y: 149, label: 'D10' },
        { name: 'D11', x: 8, y: 158.5, label: 'D11' },
        { name: 'D12', x: 8, y: 168, label: 'D12' },
        { name: 'D13', x: 72, y: 168, label: 'D13 / PB3 (LD3)' },
        { name: 'A0', x: 72, y: 139.5, label: 'A0' },
        { name: 'A1', x: 72, y: 130, label: 'A1' },
        { name: 'A2', x: 72, y: 120.5, label: 'A2' },
        { name: 'A3', x: 72, y: 111, label: 'A3' },
        { name: 'A4', x: 72, y: 101.5, label: 'A4' },
        { name: 'A5', x: 72, y: 92, label: 'A5' },
        { name: 'A6', x: 72, y: 82.5, label: 'A6' },
        { name: 'A7', x: 72, y: 73, label: 'A7' },
        { name: '5V', x: 72, y: 63.5, label: '5V' },
        { name: 'GND', x: 72, y: 44.5, label: 'GND' }
      ],
      'wokwi-74hc165': [
        { name: 'PL', x: 10, y: 15, label: 'PL (Parallel Load)' },
        { name: 'CP', x: 10, y: 25, label: 'CP (Clock)' },
        { name: 'D4', x: 10, y: 35, label: 'D4' },
        { name: 'D5', x: 10, y: 45, label: 'D5' },
        { name: 'D6', x: 10, y: 55, label: 'D6' },
        { name: 'D7', x: 10, y: 65, label: 'D7' },
        { name: 'Q7_N', x: 10, y: 75, label: 'Inverted Q7' },
        { name: 'GND', x: 10, y: 85, label: 'GND' },
        { name: 'Q7', x: 60, y: 15, label: 'Q7 (Serial Out)' },
        { name: 'DS', x: 60, y: 25, label: 'DS (Serial In)' },
        { name: 'D0', x: 60, y: 35, label: 'D0' },
        { name: 'D1', x: 60, y: 45, label: 'D1' },
        { name: 'D2', x: 60, y: 55, label: 'D2' },
        { name: 'D3', x: 60, y: 65, label: 'D3' },
        { name: 'CE', x: 60, y: 75, label: 'CE (Clock Enable)' },
        { name: 'VCC', x: 60, y: 85, label: 'VCC (5V)' }
      ],
      'wokwi-74hc595': [
        { name: 'Q1', x: 10, y: 15, label: 'Q1' },
        { name: 'Q2', x: 10, y: 25, label: 'Q2' },
        { name: 'Q3', x: 10, y: 35, label: 'Q3' },
        { name: 'Q4', x: 10, y: 45, label: 'Q4' },
        { name: 'Q5', x: 10, y: 55, label: 'Q5' },
        { name: 'Q6', x: 10, y: 65, label: 'Q6' },
        { name: 'Q7', x: 10, y: 75, label: 'Q7' },
        { name: 'GND', x: 10, y: 85, label: 'GND' },
        { name: 'VCC', x: 60, y: 15, label: 'VCC (5V)' },
        { name: 'Q0', x: 60, y: 25, label: 'Q0' },
        { name: 'DS', x: 60, y: 35, label: 'DS (Serial Data In)' },
        { name: 'OE', x: 60, y: 45, label: 'OE (Output Enable)' },
        { name: 'STCP', x: 60, y: 55, label: 'STCP (Latch Pin)' },
        { name: 'SHCP', x: 60, y: 65, label: 'SHCP (Clock Pin)' },
        { name: 'MR', x: 60, y: 75, label: 'MR (Master Reset)' },
        { name: 'Q7S', x: 60, y: 85, label: 'Q7S (Serial Out)' }
      ],
      'wokwi-a4988': [
        { name: 'ENABLE', x: 8, y: 12, label: 'ENABLE' },
        { name: 'MS1', x: 8, y: 22, label: 'MS1' },
        { name: 'MS2', x: 8, y: 32, label: 'MS2' },
        { name: 'MS3', x: 8, y: 42, label: 'MS3' },
        { name: 'RESET', x: 8, y: 52, label: 'RESET' },
        { name: 'SLEEP', x: 8, y: 62, label: 'SLEEP' },
        { name: 'STEP', x: 8, y: 72, label: 'STEP' },
        { name: 'DIR', x: 8, y: 82, label: 'DIR' },
        { name: 'VMOT', x: 64, y: 12, label: 'VMOT' },
        { name: 'GND.1', x: 64, y: 22, label: 'GND Motor' },
        { name: '2B', x: 64, y: 32, label: '2B' },
        { name: '2A', x: 64, y: 42, label: '2A' },
        { name: '1A', x: 64, y: 52, label: '1A' },
        { name: '1B', x: 64, y: 62, label: '1B' },
        { name: 'VDD', x: 64, y: 72, label: 'VDD (5V)' },
        { name: 'GND.2', x: 64, y: 82, label: 'GND Logic' }
      ],
      'ks2e-m-dc5': [
        { name: 'COIL1', x: 10, y: 18, label: 'Coil Terminal 1' },
        { name: 'COIL2', x: 10, y: 52, label: 'Coil Terminal 2' },
        { name: 'P1', x: 28, y: 18, label: 'Pole 1 (Common)' },
        { name: 'NC1', x: 44, y: 18, label: 'Normally Closed 1' },
        { name: 'NO1', x: 60, y: 18, label: 'Normally Open 1' },
        { name: 'P2', x: 28, y: 52, label: 'Pole 2 (Common)' },
        { name: 'NC2', x: 44, y: 52, label: 'Normally Closed 2' },
        { name: 'NO2', x: 60, y: 52, label: 'Normally Open 2' }
      ],
      'wokwi-ks2e-m-dc5': [
        { name: 'COIL1', x: 10, y: 18, label: 'Coil Terminal 1' },
        { name: 'COIL2', x: 10, y: 52, label: 'Coil Terminal 2' },
        { name: 'P1', x: 28, y: 18, label: 'Pole 1 (Common)' },
        { name: 'NC1', x: 44, y: 18, label: 'Normally Closed 1' },
        { name: 'NO1', x: 60, y: 18, label: 'Normally Open 1' },
        { name: 'P2', x: 28, y: 52, label: 'Pole 2 (Common)' },
        { name: 'NC2', x: 44, y: 52, label: 'Normally Closed 2' },
        { name: 'NO2', x: 60, y: 52, label: 'Normally Open 2' }
      ],
      'wokwi-ds18b20': [
        { name: 'GND', x: 12, y: 44, label: 'Ground' },
        { name: 'DQ', x: 24, y: 44, label: '1-Wire DQ' },
        { name: 'VDD', x: 36, y: 44, label: 'Power (3V - 5.5V)' }
      ],
      'wokwi-tm1637-7segment': [
        { name: 'CLK', x: 10, y: 16, label: 'Clock' },
        { name: 'DIO', x: 10, y: 28, label: 'Data IO' },
        { name: 'VCC', x: 10, y: 40, label: 'VCC (5V)' },
        { name: 'GND', x: 10, y: 52, label: 'Ground' }
      ],
      'wokwi-microsd-card': [
        { name: 'CS', x: 8, y: 14, label: 'Chip Select' },
        { name: 'DI', x: 8, y: 24, label: 'SPI MOSI (DI)' },
        { name: 'VCC', x: 8, y: 34, label: 'VCC (3.3V - 5V)' },
        { name: 'SCK', x: 8, y: 44, label: 'SPI Clock' },
        { name: 'GND', x: 8, y: 54, label: 'Ground' },
        { name: 'DO', x: 8, y: 64, label: 'SPI MISO (DO)' },
        { name: 'CD', x: 8, y: 74, label: 'Card Detect' }
      ],
      'wokwi-ili9341': [
        { name: 'VCC', x: 12, y: 14, label: 'Supply Voltage' },
        { name: 'GND', x: 12, y: 24, label: 'Ground' },
        { name: 'CS', x: 12, y: 34, label: 'Chip Select' },
        { name: 'RST', x: 12, y: 44, label: 'Reset' },
        { name: 'D/C', x: 12, y: 54, label: 'Data/Command' },
        { name: 'MOSI', x: 12, y: 64, label: 'SPI MOSI' },
        { name: 'SCK', x: 12, y: 74, label: 'SPI Clock' },
        { name: 'LED', x: 12, y: 84, label: 'Backlight' },
        { name: 'MISO', x: 12, y: 94, label: 'SPI MISO' }
      ],
      'wokwi-wifi-ap': [
        { name: 'ANT', x: 50, y: 15, label: 'RF Antenna' }
      ]
    };
  }

  // Component Catalog for Add Part Modal
  initCatalog() {
    return [
      // Microcontrollers
      { type: 'wokwi-arduino-uno', name: 'Arduino Uno R3', category: 'mcu', desc: 'ATmega328P MCU board with 14 digital and 6 analog pins' },
      { type: 'wokwi-arduino-nano', name: 'Arduino Nano', category: 'mcu', desc: 'Compact breadboard-friendly ATmega328P board' },
      { type: 'wokwi-arduino-mega', name: 'Arduino Mega 2560', category: 'mcu', desc: 'ATmega2560 MCU board with 54 digital IO pins' },
      { type: 'wokwi-pi-pico', name: 'Raspberry Pi Pico', category: 'mcu', desc: 'RP2040 Dual ARM Cortex-M0+ development board' },
      { type: 'board-franzininho-wifi', name: 'ESP32 Franzininho WiFi', category: 'mcu', desc: 'ESP32-S2 development board with built-in LEDs (Pin 33 Orange, Pin 21 Blue)' },
      { type: 'board-stm32-bluepill', name: 'STM32 Blue Pill', category: 'mcu', desc: 'ARM Cortex-M3 72MHz 32-bit MCU board with PC13 user LED' },
      { type: 'board-st-nucleo-c031c6', name: 'ST Nucleo C031C6', category: 'mcu', desc: 'STM32C0 series ARM Cortex-M0+ board with LD4 user LED (PA5)' },
      { type: 'board-st-nucleo-l031k6', name: 'ST Nucleo L031K6', category: 'mcu', desc: 'Ultra-low-power STM32L0 ARM Cortex-M0+ board with LD3 LED (PB3)' },
      { type: 'wokwi-attiny85', name: 'ATtiny85 Microcontroller', category: 'mcu', desc: '8-pin low-power AVR microcontroller with 8KB flash' },
      { type: 'wokwi-franzininho', name: 'Franzininho DIY (ATtiny85)', category: 'mcu', desc: 'Open-source Brazilian ATtiny85 board with PB1 yellow LED' },

      // Sensors
      { type: 'board-bmp180', name: 'BMP180 Barometric Pressure', category: 'sensor', desc: 'I2C Barometric pressure & temperature sensor with live slider controls' },
      { type: 'board-mfrc522', name: 'MFRC522 RFID Reader', category: 'sensor', desc: 'SPI 13.56 MHz RFID/NFC reader with card presets and tap/hold controls' },
      { type: 'wokwi-hc-sr04', name: 'HC-SR04 Ultrasonic Sensor', category: 'sensor', desc: 'Sonar distance sensor measuring 2cm - 400cm' },
      { type: 'wokwi-dht22', name: 'DHT22 Temp & Humidity', category: 'sensor', desc: 'Digital temperature and relative humidity sensor' },
      { type: 'wokwi-ds18b20', name: 'DS18B20 1-Wire Digital Temp', category: 'sensor', desc: '1-Wire programmable digital temperature sensor (-55°C to 125°C)' },
      { type: 'wokwi-pir-motion-sensor', name: 'PIR Motion Sensor', category: 'sensor', desc: 'Passive infrared human and object motion detector' },
      { type: 'wokwi-photoresistor-sensor', name: 'Photoresistor (LDR)', category: 'sensor', desc: 'Light dependent resistor module with analog/digital out' },
      { type: 'wokwi-gas-sensor', name: 'MQ-2 Gas Sensor', category: 'sensor', desc: 'Detects combustible gas, LPG, smoke, and methane' },
      { type: 'wokwi-ntc-temperature-sensor', name: 'NTC Thermistor', category: 'sensor', desc: 'Analog temperature sensor with negative coefficient' },
      { type: 'wokwi-ds1307', name: 'DS1307 RTC Module', category: 'sensor', desc: 'I2C real-time clock with battery backup simulation' },
      { type: 'wokwi-mpu6050', name: 'MPU6050 6-Axis IMU', category: 'sensor', desc: '3-axis accelerometer and 3-axis gyroscope with I2C' },
      { type: 'wokwi-hx711', name: 'HX711 Load Cell ADC', category: 'sensor', desc: '24-bit ADC amplifier for weight and strain scales' },
      { type: 'wokwi-flame-sensor', name: 'Flame Sensor', category: 'sensor', desc: 'Infrared receiver sensor for fire and flame detection' },

      // Outputs & Actuators
      { type: 'wokwi-led', name: 'LED (Configurable Color)', category: 'output', desc: 'Standard 5mm LED with click-to-change color palette' },
      { type: 'wokwi-rgb-led', name: 'RGB LED', category: 'output', desc: 'Four-pin Red-Green-Blue multi-color LED' },
      { type: 'wokwi-led-ring', name: 'NeoPixel LED Ring', category: 'output', desc: 'Circular WS2812B addressable RGB LED ring (12, 16, 24 LEDs)' },
      { type: 'wokwi-neopixel-matrix', name: 'NeoPixel 8x8 Matrix', category: 'output', desc: '64-pixel addressable RGB LED matrix panel' },
      { type: 'wokwi-neopixel', name: 'Single NeoPixel RGB LED', category: 'output', desc: 'WS2812B addressable single RGB LED breakout' },
      { type: 'wokwi-led-strip', name: 'NeoPixel LED Strip', category: 'output', desc: 'Chain of addressable WS2812B RGB LEDs' },
      { type: 'wokwi-led-bar-graph', name: '10-Segment LED Bar Graph', category: 'output', desc: '10 independent LEDs in a single compact DIP package' },
      { type: 'wokwi-servo', name: 'Standard Servo Motor', category: 'output', desc: 'Hobby positional servo motor (0° to 180°)' },
      { type: 'wokwi-buzzer', name: 'Piezo Buzzer', category: 'output', desc: 'Audio transducer for musical tones and beeps' },
      { type: 'wokwi-relay-module', name: '5V Relay Module', category: 'output', desc: 'Songle electromechanical relay with status LED & screw terminals' },
      { type: 'ks2e-m-dc5', name: 'KS2E-M-DC5 DPDT Relay', category: 'output', desc: 'Double pole double throw electromechanical relay' },
      { type: 'wokwi-stepper-motor', name: 'Stepper Motor', category: 'output', desc: '4-wire bipolar or unipolar stepper motor' },
      { type: 'wokwi-a4988', name: 'A4988 Stepper Motor Driver', category: 'output', desc: 'Microstepping driver for bipolar stepper motors' },
      { type: 'wokwi-biaxial-stepper', name: 'Biaxial Stepper Motor', category: 'output', desc: 'Concentric dual stepper motor with inner and outer hands' },

      // Displays
      { type: 'board-ssd1306', name: 'SSD1306 OLED Display (0.96")', category: 'display', desc: '128x64 I2C monochrome graphic OLED screen' },
      { type: 'board-grove-oled-sh1107', name: 'Grove OLED Display 128x128', category: 'display', desc: '128x128 monochrome graphic OLED display with I2C interface' },
      { type: 'wokwi-lcd1602', name: '16x2 Character LCD', category: 'display', desc: 'HD44780 standard parallel or I2C alphanumeric LCD' },
      { type: 'wokwi-lcd2004', name: '20x4 Character LCD', category: 'display', desc: '4-line 20-character alphanumeric LCD display' },
      { type: 'wokwi-7segment', name: '7-Segment Display', category: 'display', desc: 'Single-digit 7-segment numeric LED display' },
      { type: 'wokwi-tm1637-7segment', name: 'TM1637 4-Digit Display', category: 'display', desc: '4-digit clock display with colon and 2-wire serial interface' },
      { type: 'wokwi-max7219-matrix', name: 'MAX7219 8x8 LED Matrix', category: 'display', desc: 'SPI driven 8x8 dot matrix display module' },
      { type: 'wokwi-ili9341', name: 'ILI9341 2.8" Color TFT LCD', category: 'display', desc: '240x320 full color graphic TFT display with SPI interface' },
      { type: 'wokwi-nokia-5110-screen', name: 'Nokia 5110 Screen', category: 'display', desc: '84x48 monochrome graphic LCD screen' },

      // Inputs & Switches
      { type: 'wokwi-pushbutton', name: 'Pushbutton (12mm)', category: 'input', desc: 'Momentary 12mm tactile pushbutton' },
      { type: 'wokwi-pushbutton-6mm', name: 'Pushbutton (6mm)', category: 'input', desc: 'Compact 6mm tactile momentary pushbutton' },
      { type: 'wokwi-potentiometer', name: 'Rotary Potentiometer', category: 'input', desc: 'Rotary potentiometer dial (0 - 1023 analog)' },
      { type: 'wokwi-slide-potentiometer', name: 'Slide Potentiometer', category: 'input', desc: 'Sliding variable resistor with linear travel' },
      { type: 'wokwi-analog-joystick', name: '2-Axis Analog Joystick', category: 'input', desc: 'Dual-axis thumb joystick with push button' },
      { type: 'wokwi-ky-040', name: 'KY-040 Rotary Encoder', category: 'input', desc: 'Quadrature digital rotary encoder with push switch' },
      { type: 'wokwi-slide-switch', name: 'Slide Switch (SPDT)', category: 'input', desc: 'Three-terminal mechanical slide switch' },
      { type: 'wokwi-dip-switch-8', name: '8-Position DIP Switch', category: 'input', desc: 'Array of 8 individual miniature on/off slide switches' },
      { type: 'wokwi-membrane-keypad', name: '4x4 Matrix Keypad', category: 'input', desc: '16-button matrix keypad for numeric and password entry' },
      { type: 'wokwi-ir-remote', name: 'IR Remote Controller', category: 'input', desc: '21-button NEC protocol infrared remote transmitter' },
      { type: 'wokwi-ir-receiver', name: 'IR Receiver (38kHz)', category: 'input', desc: 'Infrared receiver module for NEC demodulation' },

      // Passives & Logic
      { type: 'wokwi-resistor', name: 'Resistor (Configurable Ω)', category: 'passive', desc: 'Through-hole resistor with click-to-edit resistance & color bands' },
      { type: 'wokwi-74hc595', name: '74HC595 Shift Register', category: 'logic', desc: '8-bit Serial-In Parallel-Out shift register for output pin expansion' },
      { type: 'wokwi-74hc165', name: '74HC165 Shift Register', category: 'logic', desc: '8-bit Parallel-In Serial-Out shift register for input pin expansion' },
      { type: 'wokwi-nlsf595', name: 'NLSF595 Serial RGB Driver', category: 'logic', desc: 'Serial SPI driver for common-anode RGB LEDs' },

      // Tools & System
      { type: 'wokwi-microsd-card', name: 'MicroSD Card (SPI)', category: 'tools', desc: 'FAT16 simulated SD card storage for Arduino sketches' },
      { type: 'wokwi-logic-analyzer', name: '8-Channel Logic Analyzer', category: 'tools', desc: 'Records digital signals to VCD format for PulseView' },
      { type: 'wokwi-clock-generator', name: 'Clock Generator', category: 'tools', desc: 'Configurable digital square wave frequency source' },
      { type: 'wokwi-wifi-ap', name: 'WiFi Access Point', category: 'tools', desc: 'Simulated 2.4 GHz 802.11 b/g/n WiFi network AP for ESP32' }
    ];
  }

  initEventListeners() {
    // Canvas Mouse Events
    this.board.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.board.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.board.addEventListener('mousedown', (e) => this.onBoardMouseDown(e));

    // Wheel Zoom centered at cursor
    this.board.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Global Keyboard Shortcuts
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
  }

  onBoardMouseDown(e) {
    // If clicking directly on empty canvas or SVG
    const isCanvasBg = e.target === this.board || e.target === this.svg || e.target === this.viewport;
    if (isCanvasBg) {
      if (this.isDrawingWire) {
        // Bend points feature: Clicking empty space adds a bend point!
        const canvasCoords = this.screenToCanvas(e.clientX, e.clientY);
        this.wireBendPoints.push(canvasCoords);
        this.updatePreviewWire(
          this.wireStart.absX,
          this.wireStart.absY,
          canvasCoords.x,
          canvasCoords.y,
          this.wireBendPoints
        );
        return;
      }

      if (!e.shiftKey) {
        this.deselectAll();
      }

      // Middle click or Alt/Space drag: Pan canvas
      if (e.button === 1 || e.button === 0) {
        this.isPanning = true;
        this.panStartMouse = { x: e.clientX, y: e.clientY };
        this.panStart = { x: this.pan.x, y: this.pan.y };
        this.board.style.cursor = 'grab';
      }
    }
  }

  onMouseMove(e) {
    // 1. Panning Canvas
    if (this.isPanning) {
      const dx = e.clientX - this.panStartMouse.x;
      const dy = e.clientY - this.panStartMouse.y;
      this.pan.x = this.panStart.x + dx;
      this.pan.y = this.panStart.y + dy;
      this.updateViewportTransform();
      return;
    }

    // 2. Dragging Selected Components
    if (this.isDraggingComp) {
      const deltaX = (e.clientX - this.dragStartMouse.x) / this.zoom;
      const deltaY = (e.clientY - this.dragStartMouse.y) / this.zoom;

      this.selectedComponents.forEach(comp => {
        const start = this.dragStartPositions.get(comp.id);
        if (!start) return;

        let newX = start.x + deltaX;
        let newY = start.y + deltaY;

        // Snapping: 10px grid if enabled, 1px if disabled
        const snap = this.gridEnabled ? this.gridSize : 1;
        newX = Math.round(newX / snap) * snap;
        newY = Math.round(newY / snap) * snap;

        comp.x = newX;
        comp.y = newY;
        if (comp.domWrapper) {
          comp.domWrapper.style.left = `${newX}px`;
          comp.domWrapper.style.top = `${newY}px`;
        }
      });

      this.renderWires();
      return;
    }

    // 3. Drawing Wire Rubberband with Bend Points
    if (this.isDrawingWire && this.wireStart) {
      const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
      this.updatePreviewWire(
        this.wireStart.absX,
        this.wireStart.absY,
        canvasPos.x,
        canvasPos.y,
        this.wireBendPoints
      );
    }
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.board.style.cursor = '';
    }
    if (this.isDraggingComp) {
      this.isDraggingComp = false;
      this.dragStartPositions.clear();
    }
  }

  onWheel(e) {
    // Zoom on wheel when Ctrl held, or when mouse is inside circuit board
    if (e.ctrlKey || e.metaKey || document.activeElement === this.board || e.target.closest('#circuitBoard')) {
      e.preventDefault();
      const boardRect = this.board.getBoundingClientRect();
      const mouseX = e.clientX - boardRect.left;
      const mouseY = e.clientY - boardRect.top;

      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      const oldZoom = this.zoom;
      const newZoom = Math.min(Math.max(oldZoom * factor, 0.3), 3.0);

      // Cursor-centered zoom formula
      this.pan.x = mouseX - (mouseX - this.pan.x) * (newZoom / oldZoom);
      this.pan.y = mouseY - (mouseY - this.pan.y) * (newZoom / oldZoom);
      this.zoom = newZoom;

      this.updateViewportTransform();
      this.renderWires();
    }
  }

  // Keyboard Shortcuts Handler
  onKeyDown(e) {
    // Never hijack keystrokes if typing inside text fields or code editors
    const active = document.activeElement;
    if (active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.isContentEditable ||
      active.closest('.blocklyWidgetDiv') ||
      active.closest('.blocklyDropDownDiv')
    )) {
      return;
    }

    const key = e.key.toLowerCase();

    // 1. Escape: Cancel wire drawing or deselect
    if (e.key === 'Escape') {
      if (this.isDrawingWire) {
        this.cancelWireDrawing();
      } else {
        this.deselectAll();
      }
      return;
    }

    // 2. Add Part Shortcut: "A" key
    if (key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.openAddPartModal();
      return;
    }

    // 3. Rotate Part Shortcut: "R" key (90° clockwise)
    if (key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.rotateSelected();
      return;
    }

    // 4. Duplicate Part Shortcut: "D" key
    if (key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.duplicateSelected();
      return;
    }

    // 5. Delete Shortcut: "Delete" or "Backspace"
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.deleteSelected();
      return;
    }

    // 6. Grid Toggle Shortcut: "G" key
    if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.toggleGrid();
      return;
    }

    // 7. Zoom Shortcuts: "+", "=", "-", "_", "F"
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.zoomIn();
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      this.zoomOut();
      return;
    }
    if (key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.zoomFit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      this.zoomReset();
      return;
    }

    // 8. Arrow Keys: Nudge selected components (Shift for 50px, normal for 10px)
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      if (this.selectedComponents.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 50 : 10;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        this.nudgeSelected(dx, dy);
        return;
      }
    }

    // 9. Wire Color Shortcuts: 0-9, c, l, m, p, y
    if (this.wireColorMap[key]) {
      const colorHex = this.wireColorMap[key].hex;
      this.setWireColor(colorHex);
      return;
    }
  }

  // Coordinate Conversion
  screenToCanvas(clientX, clientY) {
    const boardRect = (this.viewport || this.board).getBoundingClientRect();
    return {
      x: (clientX - boardRect.left) / this.zoom,
      y: (clientY - boardRect.top) / this.zoom
    };
  }

  // ==========================================
  // Component Addition & DOM Creation
  // ==========================================
  addComponent(type, x = 100, y = 100, attrs = {}) {
    const id = 'part_' + type.replace(/^(wokwi-|board-)/, '') + '_' + Date.now().toString(36).slice(-4);
    const comp = {
      id: id,
      type: type,
      x: x,
      y: y,
      rotation: 0,
      attrs: { ...attrs },
      element: null,
      domWrapper: null
    };

    this.createDomElement(comp);
    this.netlist.addComponent(comp);
    this.selectComponent(comp, false);
    this.renderWires();
    if (window.circuitHealthChecker) {
      window.circuitHealthChecker.checkHealth();
    }

    return comp;
  }

  createDomElement(comp) {
    const wrapper = document.createElement('div');
    wrapper.className = 'circuit-component';
    wrapper.id = 'comp_wrap_' + comp.id;
    wrapper.style.left = `${comp.x}px`;
    wrapper.style.top = `${comp.y}px`;
    wrapper.dataset.id = comp.id;

    // Optional floating quick-action pill shown cleanly on selection (no bulky header!)
    const actionPill = document.createElement('div');
    actionPill.className = 'comp-action-pill';
    actionPill.innerHTML = `
      <button class="pill-btn" title="Rotate 90° (R)">&#x21BB;</button>
      <button class="pill-btn" title="Duplicate (D)">&#x2398;</button>
      <button class="pill-btn pill-del" title="Delete (Del)">&times;</button>
    `;
    const [rotBtn, dupBtn, delBtn] = actionPill.querySelectorAll('button');
    rotBtn.onclick = (e) => { e.stopPropagation(); this.selectComponent(comp, false); this.rotateSelected(); };
    dupBtn.onclick = (e) => { e.stopPropagation(); this.selectComponent(comp, false); this.duplicateSelected(); };
    delBtn.onclick = (e) => { e.stopPropagation(); this.deleteComponent(comp.id); };
    wrapper.appendChild(actionPill);

    // Container for Wokwi Element + Pin Dots (rotates atomically)
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'comp-element-container';

    // Wokwi Web Component
    let wokwiEl;
    try {
      wokwiEl = document.createElement(comp.type);
    } catch (e) {
      wokwiEl = document.createElement('div');
    }
    wokwiEl.id = 'el_' + comp.id;

    // Apply component-specific attributes
    if (comp.type === 'wokwi-led') {
      wokwiEl.color = comp.attrs.color || 'red';
      wokwiEl.value = false;
      wokwiEl.addEventListener('click', (e) => {
        if (!this.isDrawingWire) this.openLedPopup(comp);
      });
    } else if (comp.type === 'wokwi-resistor') {
      wokwiEl.value = comp.attrs.value || 220;
      wokwiEl.addEventListener('click', (e) => {
        if (!this.isDrawingWire) this.openResistorPopup(comp);
      });
    } else if (comp.type === 'wokwi-led-ring') {
      wokwiEl.pixels = comp.attrs.pixels || 16;
      wokwiEl.addEventListener('click', (e) => {
        if (!this.isDrawingWire) this.openNeoPixelPopup(comp);
      });
    } else if (comp.type === 'wokwi-neopixel-matrix') {
      wokwiEl.rows = comp.attrs.rows || 8;
      wokwiEl.cols = comp.attrs.cols || 8;
    } else if (comp.type === 'wokwi-relay-module') {
      wokwiEl.value = false;
    } else if (comp.type === 'wokwi-potentiometer') {
      wokwiEl.value = comp.attrs.value || 0;
      wokwiEl.min = 0;
      wokwiEl.max = 1023;
    } else if (comp.type === 'wokwi-servo') {
      wokwiEl.angle = comp.attrs.angle || 0;
    } else if (comp.type === 'board-bmp180') {
      wokwiEl.temperature = comp.attrs.temperature || 24;
      wokwiEl.pressure = comp.attrs.pressure || 101325;
      // Click on BMP180 opens interactive sensor control popup
      wokwiEl.addEventListener('click', (e) => {
        if (!this.isDrawingWire) this.openBmp180Popup(comp);
      });
    } else if (comp.type === 'board-mfrc522') {
      wokwiEl.addEventListener('click', (e) => {
        if (!this.isDrawingWire) this.openMfrc522Popup(comp);
      });
    } else if (comp.type === 'wokwi-pushbutton' || comp.type === 'wokwi-pushbutton-6mm') {
      wokwiEl.addEventListener('mousedown', () => {
        if (window.soundEngine) window.soundEngine.playSwitchClick(false);
      });
      wokwiEl.addEventListener('mouseup', () => {
        if (window.soundEngine) window.soundEngine.playSwitchClick(true);
      });
    }

    comp.element = wokwiEl;
    comp.domWrapper = wrapper;
    comp.bodyContainer = bodyContainer;

    bodyContainer.appendChild(wokwiEl);
    this.renderPinTargets(comp, bodyContainer);
    wrapper.appendChild(bodyContainer);

    // Selection & Dragging Events directly on component body
    wrapper.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('pin-dot') || e.target.closest('.comp-action-pill') || e.target.closest('.sensor-popup')) {
        return;
      }
      this.onComponentMouseDown(e, comp);
    });

    (this.viewport || this.board).appendChild(wrapper);
  }

  renderPinTargets(comp, container) {
    const pins = this.getComponentPins(comp);
    pins.forEach(pin => {
      const pinDot = document.createElement('div');
      pinDot.className = 'pin-dot';
      pinDot.style.left = `${pin.x}px`;
      pinDot.style.top = `${pin.y}px`;
      pinDot.title = `${comp.type.replace(/^(wokwi-|board-)/, '')} [${pin.name}]: ${pin.label || pin.name}`;
      pinDot.dataset.pin = pin.name;
      pinDot.dataset.compId = comp.id;

      pinDot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onPinClick(comp.id, pin.name, pin.x, pin.y);
      });

      container.appendChild(pinDot);
    });
  }

  getComponentPins(comp) {
    if (comp.element && Array.isArray(comp.element.pinInfo) && comp.element.pinInfo.length > 0) {
      return comp.element.pinInfo.map(p => ({
        name: String(p.name),
        x: p.x,
        y: p.y,
        label: p.name
      }));
    }
    return this.pinMap[comp.type] || [];
  }

  // Exact sub-pixel pin position querying accounting for rotation and zoom
  getPinAbsolutePosition(compId, pinName) {
    const comp = this.netlist.getComponent(compId);
    if (!comp || !comp.domWrapper) return null;

    const pinDot = comp.domWrapper.querySelector(`.pin-dot[data-pin="${pinName}"]`);
    if (pinDot && typeof pinDot.getBoundingClientRect === 'function') {
      const pinRect = pinDot.getBoundingClientRect();
      const viewRect = (this.viewport || this.board).getBoundingClientRect();
      const z = this.zoom || 1.0;
      if (pinRect.width > 0 || pinRect.height > 0) {
        return {
          x: (pinRect.left + pinRect.width / 2 - viewRect.left) / z,
          y: (pinRect.top + pinRect.height / 2 - viewRect.top) / z
        };
      }
    }

    // Safe mathematical fallback (for headless Node tests)
    const pins = this.getComponentPins(comp);
    const pin = pins.find(p => String(p.name) === String(pinName));
    const headerOffset = 0; // Clean components have no top header offset
    if (pin) {
      return {
        x: comp.x + pin.x,
        y: comp.y + pin.y + headerOffset
      };
    }
    return { x: comp.x + 30, y: comp.y + 30 };
  }

  onComponentMouseDown(e, comp) {
    if (e.button !== 0) return;
    this.isDraggingComp = true;
    this.dragStartMouse = { x: e.clientX, y: e.clientY };

    if (!e.shiftKey && !this.selectedComponents.has(comp)) {
      this.selectComponent(comp, false);
    } else if (e.shiftKey) {
      this.selectComponent(comp, true);
    }

    this.dragStartPositions.clear();
    this.selectedComponents.forEach(c => {
      this.dragStartPositions.set(c.id, { x: c.x, y: c.y });
    });

    e.preventDefault();
    e.stopPropagation();
  }

  // ==========================================
  // Part Operations: Rotate, Duplicate, Nudge, Delete
  // ==========================================
  rotateSelected(delta = 90) {
    if (this.selectedComponents.size === 0) return;

    this.selectedComponents.forEach(comp => {
      comp.rotation = ((comp.rotation || 0) + delta) % 360;
      this.updateComponentTransform(comp);
    });

    this.renderWires();
    const first = this.selectedComponent;
    this.showToast(`Rotated to ${first.rotation}°`, 'info');
  }

  updateComponentTransform(comp) {
    if (!comp || !comp.bodyContainer) return;
    comp.bodyContainer.style.transform = comp.rotation ? `rotate(${comp.rotation}deg)` : '';
    comp.bodyContainer.style.transformOrigin = 'center center';
  }

  duplicateSelected() {
    if (this.selectedComponents.size === 0) return;

    const srcList = Array.from(this.selectedComponents);
    const duplicates = [];
    srcList.forEach(src => {
      const newComp = this.addComponent(
        src.type,
        src.x + 20,
        src.y + 20,
        JSON.parse(JSON.stringify(src.attrs || {}))
      );
      if (src.rotation) {
        newComp.rotation = src.rotation;
        this.updateComponentTransform(newComp);
      }
      duplicates.push(newComp);
    });

    this.deselectAll();
    duplicates.forEach(d => this.selectComponent(d, true));
    this.renderWires();
    this.showToast(`Duplicated ${duplicates.length} item${duplicates.length > 1 ? 's' : ''}`, 'info');
  }

  nudgeSelected(dx, dy) {
    this.selectedComponents.forEach(comp => {
      comp.x += dx;
      comp.y += dy;
      if (comp.domWrapper) {
        comp.domWrapper.style.left = `${comp.x}px`;
        comp.domWrapper.style.top = `${comp.y}px`;
      }
    });
    this.renderWires();
  }

  deleteSelected() {
    let deletedCount = 0;
    const compList = Array.from(this.selectedComponents);
    const wireList = Array.from(this.selectedWires);

    compList.forEach(comp => {
      this.deleteComponent(comp.id, false);
      deletedCount++;
    });
    wireList.forEach(wire => {
      this.netlist.removeWire(wire.id);
      deletedCount++;
    });

    this.selectedComponents.clear();
    this.selectedWires.clear();
    this.renderWires();
    if (window.circuitHealthChecker) {
      window.circuitHealthChecker.checkHealth();
    }
    if (deletedCount > 0) {
      this.showToast(`Deleted ${deletedCount} item${deletedCount > 1 ? 's' : ''}`, 'info');
    }
  }

  deleteComponent(compId, notify = true) {
    const comp = this.netlist.getComponent(compId);
    if (!comp) return;

    if (comp.domWrapper) {
      comp.domWrapper.remove();
    }
    this.netlist.removeComponent(compId);
    this.selectedComponents.delete(comp);
    this.renderWires();
    if (notify) this.showToast(`Deleted ${comp.type.replace(/^(wokwi-|board-)/, '')}`, 'info');
  }

  deleteWire(wireId) {
    this.netlist.removeWire(wireId);
    this.selectedWires.forEach(w => {
      if (w.id === wireId) this.selectedWires.delete(w);
    });
    this.renderWires();
    this.showToast('Wire deleted', 'info');
  }

  // ==========================================
  // Wiring & Auto-Coloring & Bend Points
  // ==========================================
  determineAutoWireColor(pinName, compType) {
    const p = String(pinName || '').toUpperCase();
    // GND -> Black
    if (p.includes('GND') || p === 'VSS' || p === 'COM') return '#1a202c';
    // Power (5V, VCC, 3.3V, VIN, VDD) -> Red
    if (p.includes('5V') || p.includes('VCC') || p.includes('VIN') || p.includes('3.3V') || p === '3V3' || p === 'V+' || p === 'VDD') return '#e53e3e';
    // I2C / Serial Data (SDA, SCL, TX, RX) -> Blue
    if (p.includes('SDA') || p.includes('SCL') || p === 'TX' || p === 'RX') return '#3182ce';
    // Clock / Control (CLK, SCK, TRIG, ECHO) -> Violet / Purple
    if (p.includes('CLK') || p.includes('SCK') || p === 'TRIG' || p === 'ECHO') return '#805ad5';
    // Default to active wire palette color
    return this.activeWireColor || '#38a169';
  }

  onPinClick(compId, pinName, localX, localY) {
    const absPos = this.getPinAbsolutePosition(compId, pinName);
    if (!absPos) return;

    const comp = this.netlist.getComponent(compId);

    if (!this.isDrawingWire) {
      // 1. Start drawing wire
      this.isDrawingWire = true;
      this.wireStart = {
        compId: compId,
        pin: pinName,
        absX: absPos.x,
        absY: absPos.y
      };
      this.wireBendPoints = [];
      this.drawingWireColor = this.determineAutoWireColor(pinName, comp ? comp.type : '');
      this.createPreviewWire(absPos.x, absPos.y);
      this.showToast(`Wiring from ${pinName} (auto-color: ${this.getColorName(this.drawingWireColor)}). Click canvas for bend points, or target pin to connect.`, 'info');
    } else {
      // 2. Complete wire
      if (this.wireStart.compId === compId && this.wireStart.pin === pinName) {
        // Cancel wire if clicked starting pin
        this.cancelWireDrawing();
        return;
      }

      const fromCompId = this.wireStart.compId;
      const fromPin = this.wireStart.pin;

      const wire = this.netlist.addWire(
        { compId: fromCompId, pin: fromPin },
        { compId: compId, pin: pinName },
        this.drawingWireColor,
        this.wireBendPoints
      );

      this.cancelWireDrawing();

      if (wire) {
        this.renderWires();
        if (window.soundEngine) window.soundEngine.playWireSnap();
        if (window.circuitHealthChecker) window.circuitHealthChecker.checkHealth();
        this.showToast(`Connected ${fromPin} \u2194 ${pinName}!`, 'success');
      } else {
        this.showToast('Connection already exists or is invalid.', 'error');
      }
    }
  }

  createPreviewWire(startX, startY) {
    if (this.previewWire) this.previewWire.remove();
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'circuit-wire preview');
    path.setAttribute('stroke', this.drawingWireColor);
    path.setAttribute('stroke-width', '3.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-dasharray', '5,5');
    this.svg.appendChild(path);
    this.previewWire = path;
  }

  updatePreviewWire(x1, y1, currentX, currentY, bendPoints = []) {
    if (!this.previewWire) return;
    const p1 = { x: x1, y: y1 };
    const p2 = { x: currentX, y: currentY };
    const d = this.calculateWirePath(p1, p2, bendPoints);
    this.previewWire.setAttribute('d', d);
  }

  cancelWireDrawing() {
    this.isDrawingWire = false;
    this.wireStart = null;
    this.wireBendPoints = [];
    if (this.previewWire) {
      this.previewWire.remove();
      this.previewWire = null;
    }
  }

  setWireRoutingMode(mode) {
    this.wireRoutingMode = mode || 'orthogonal';
    this.renderWires();
    this.showToast(`Wire style: ${this.wireRoutingMode === 'orthogonal' ? 'Neat (Orthogonal 90°)' : 'Curved (Bezier)'}`, 'info');
  }

  calculateWirePath(p1, p2, bendPoints = []) {
    let points = [];
    if (bendPoints && bendPoints.length > 0) {
      points = [p1, ...bendPoints, p2];
    } else if (this.wireRoutingMode === 'curved') {
      return this.calculateBezierPath(p1.x, p1.y, p2.x, p2.y);
    } else {
      // Neat orthogonal routing (Manhattan with rounded corners)
      points = this.calculateOrthogonalPoints(p1, p2);
    }

    return this.pointsToRoundedPath(points);
  }

  calculateOrthogonalPoints(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 6 || Math.abs(dy) < 6) {
      return [p1, p2];
    }

    // Determine orthogonal routing:
    // If destination is above p1 (e.g. Uno digital pins routing to components above as in Screenshot 081210):
    // Line goes straight up to p2.y, turns 90° right/left horizontally into p2.x
    if (dy < 0) {
      return [p1, { x: p1.x, y: p2.y }, p2];
    } else {
      // If destination is below and to the side:
      // Drop down 35px, run horizontal, then turn into p2
      const stepY = p1.y + Math.min(dy * 0.5, 40);
      return [p1, { x: p1.x, y: stepY }, { x: p2.x, y: stepY }, p2];
    }
  }

  pointsToRoundedPath(points) {
    if (!points || points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    const r = 8; // rounded corner radius

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      const d1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const d2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len1 = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
      const len2 = Math.sqrt(d2.x * d2.x + d2.y * d2.y);

      if (len1 > r * 1.5 && len2 > r * 1.5) {
        const pStart = {
          x: curr.x - (d1.x / len1) * r,
          y: curr.y - (d1.y / len1) * r
        };
        const pEnd = {
          x: curr.x + (d2.x / len2) * r,
          y: curr.y + (d2.y / len2) * r
        };
        d += ` L ${pStart.x} ${pStart.y} Q ${curr.x} ${curr.y}, ${pEnd.x} ${pEnd.y}`;
      } else {
        d += ` L ${curr.x} ${curr.y}`;
      }
    }

    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  }

  calculateBezierPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curveOffset = Math.min(Math.max(dist * 0.25, 25), 90);

    const cx1 = x1 + dx * 0.3;
    const cy1 = y1 + (dy > 0 ? curveOffset : -curveOffset);
    const cx2 = x2 - dx * 0.3;
    const cy2 = y2 + (dy > 0 ? -curveOffset : curveOffset);

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  renderWires() {
    const existing = this.svg.querySelectorAll('.circuit-wire:not(.preview)');
    existing.forEach(p => p.remove());

    const wires = this.netlist.getWires();
    wires.forEach(wire => {
      const p1 = this.getPinAbsolutePosition(wire.from.compId, wire.from.pin);
      const p2 = this.getPinAbsolutePosition(wire.to.compId, wire.to.pin);
      if (!p1 || !p2) return;

      const d = this.calculateWirePath(p1, p2, wire.bendPoints || []);

      // Wire Shadow Path
      const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      shadowPath.setAttribute('d', d);
      shadowPath.setAttribute('class', 'circuit-wire shadow');
      shadowPath.setAttribute('stroke', 'rgba(0,0,0,0.22)');
      shadowPath.setAttribute('stroke-width', '5');
      shadowPath.setAttribute('fill', 'none');
      this.svg.appendChild(shadowPath);

      // Main Colored Wire Path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      const isSelected = this.selectedWires.has(wire);
      path.setAttribute('class', 'circuit-wire' + (isSelected ? ' selected' : ''));
      path.setAttribute('stroke', wire.color || '#38a169');
      path.setAttribute('stroke-width', '3.5');
      path.setAttribute('fill', 'none');
      path.dataset.wireId = wire.id;

      // Click to select
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectWire(wire, e.shiftKey);
      });

      // Double-click to delete wire immediately
      path.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.deleteWire(wire.id);
      });

      this.svg.appendChild(path);
    });
  }

  // ==========================================
  // Selection Management (Supports Multi-Selection)
  // ==========================================
  selectComponent(comp, multi = false) {
    if (!multi) {
      this.deselectAll();
    }
    if (comp) {
      if (multi && this.selectedComponents.has(comp)) {
        this.selectedComponents.delete(comp);
        if (comp.domWrapper) comp.domWrapper.classList.remove('selected');
      } else {
        this.selectedComponents.add(comp);
        if (comp.domWrapper) comp.domWrapper.classList.add('selected');
      }
    }
  }

  selectWire(wire, multi = false) {
    if (!multi) {
      this.deselectAll();
    }
    if (wire) {
      if (multi && this.selectedWires.has(wire)) {
        this.selectedWires.delete(wire);
      } else {
        this.selectedWires.add(wire);
      }
      this.renderWires();
      this.showToast(`Selected wire (${wire.from.pin} \u2194 ${wire.to.pin}). Double-click or press Delete to remove.`, 'info');
    }
  }

  deselectAll() {
    this.selectedComponents.forEach(c => {
      if (c.domWrapper) c.domWrapper.classList.remove('selected');
    });
    this.selectedComponents.clear();
    this.selectedWires.clear();
    this.renderWires();
  }

  // ==========================================
  // Wire Color Control & Shortcuts
  // ==========================================
  setWireColor(color) {
    this.activeWireColor = color;
    if (this.isDrawingWire) {
      this.drawingWireColor = color;
      if (this.previewWire) {
        this.previewWire.setAttribute('stroke', color);
      }
    }

    if (this.selectedWires.size > 0) {
      this.selectedWires.forEach(w => {
        w.color = color;
      });
      this.renderWires();
      this.showToast(`Wire color changed to ${this.getColorName(color)}`, 'info');
    }

    // Sync active state in UI palette
    document.querySelectorAll('.wire-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });
  }

  getColorName(hex) {
    for (const k in this.wireColorMap) {
      if (this.wireColorMap[k].hex.toLowerCase() === (hex || '').toLowerCase()) {
        return this.wireColorMap[k].name;
      }
    }
    return hex;
  }

  // ==========================================
  // Canvas View Controls: Zoom, Pan & Grid
  // ==========================================
  toggleGrid() {
    this.gridEnabled = !this.gridEnabled;
    if (this.board) {
      this.board.classList.toggle('grid-disabled', !this.gridEnabled);
    }
    this.showToast(`Grid: ${this.gridEnabled ? 'ON' : 'OFF'} (spacing: 10px)`, 'info');
  }

  zoomIn() {
    this.zoom = Math.min(3.0, this.zoom * 1.2);
    this.updateViewportTransform();
    this.renderWires();
  }

  zoomOut() {
    this.zoom = Math.max(0.3, this.zoom / 1.2);
    this.updateViewportTransform();
    this.renderWires();
  }

  zoomReset() {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.updateViewportTransform();
    this.renderWires();
  }

  zoomFit() {
    const comps = this.netlist.getAllComponents();
    if (comps.length === 0) {
      this.zoomReset();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    comps.forEach(c => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + 200);
      maxY = Math.max(maxY, c.y + 150);
    });

    const boardRect = this.board.getBoundingClientRect();
    const margin = 60;
    const contentW = maxX - minX + margin * 2;
    const contentH = maxY - minY + margin * 2;

    const scaleX = boardRect.width / contentW;
    const scaleY = boardRect.height / contentH;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.8);

    this.zoom = fitZoom;
    this.pan.x = (boardRect.width - (maxX + minX) * fitZoom) / 2;
    this.pan.y = (boardRect.height - (maxY + minY) * fitZoom) / 2;

    this.updateViewportTransform();
    this.renderWires();
    this.showToast('Fit diagram to view', 'info');
  }

  // ==========================================
  // Add Part Modal & Search Dialog
  // ==========================================
  openAddPartModal() {
    let modal = document.getElementById('addPartModal');
    if (!modal) {
      modal = this.createAddPartModal();
    }
    modal.style.display = 'flex';
    const searchInput = document.getElementById('partSearchInput');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      this.filterCatalog('');
    }
  }

  closeAddPartModal() {
    const modal = document.getElementById('addPartModal');
    if (modal) modal.style.display = 'none';
  }

  createAddPartModal() {
    const modal = document.createElement('div');
    modal.id = 'addPartModal';
    modal.className = 'part-modal-backdrop';

    modal.innerHTML = `
      <div class="part-modal-content">
        <div class="part-modal-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">&#x2795;</span>
            <h3 style="margin:0; font-size:1.1rem; color:var(--text);">Add Component</h3>
          </div>
          <button class="modal-close-btn" onclick="circuitCanvas.closeAddPartModal()">&times;</button>
        </div>

        <div class="part-search-bar">
          <input type="text" id="partSearchInput" placeholder="Search parts... (e.g. BMP180, RFID, LED, DHT22, Servo, Uno)" autocomplete="off">
        </div>

        <div class="part-categories">
          <button class="part-cat-btn active" onclick="circuitCanvas.filterCatalogByCategory('all', this)">All</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('mcu', this)">Microcontrollers</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('sensor', this)">Sensors</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('output', this)">Outputs</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('display', this)">Displays</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('input', this)">Inputs</button>
          <button class="part-cat-btn" onclick="circuitCanvas.filterCatalogByCategory('passive', this)">Passives</button>
        </div>

        <div class="part-grid" id="partCatalogGrid"></div>

        <div class="part-modal-footer">
          <span style="font-size:0.75rem; color:var(--text-muted);">
            Shortcuts: <strong>A</strong> Add Part &bull; <strong>R</strong> Rotate &bull; <strong>D</strong> Duplicate &bull; <strong>Del</strong> Delete &bull; <strong>0-9</strong> Colors &bull; <strong>G</strong> Grid &bull; <strong>+/-</strong> Zoom
          </span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeAddPartModal();
    });

    const searchInput = modal.querySelector('#partSearchInput');
    searchInput.addEventListener('input', (e) => {
      this.filterCatalog(e.target.value.toLowerCase());
    });

    return modal;
  }

  filterCatalog(query = '', category = 'all') {
    const grid = document.getElementById('partCatalogGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = this.catalog.filter(item => {
      const matchCat = category === 'all' || item.category === category;
      const matchQuery = !query ||
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.desc.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'part-card';
      card.innerHTML = `
        <div class="part-card-title">${item.name}</div>
        <div class="part-card-desc">${item.desc}</div>
        <div class="part-card-tag">${item.category.toUpperCase()}</div>
      `;
      card.onclick = () => {
        // Place in visible center with small stagger
        const boardRect = this.board.getBoundingClientRect();
        const centerCanvas = this.screenToCanvas(
          boardRect.left + boardRect.width / 2 + (Math.random() * 40 - 20),
          boardRect.top + boardRect.height / 2 + (Math.random() * 40 - 20)
        );
        this.addComponent(item.type, Math.round(centerCanvas.x), Math.round(centerCanvas.y));
        this.closeAddPartModal();
        this.showToast(`Added ${item.name}`, 'success');
      };
      grid.appendChild(card);
    });
  }

  filterCatalogByCategory(cat, btn) {
    document.querySelectorAll('.part-cat-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const query = (document.getElementById('partSearchInput')?.value || '').toLowerCase();
    this.filterCatalog(query, cat);
  }

  // ==========================================
  // Interactive Component Control Popups
  // ==========================================
  openBmp180Popup(comp) {
    let popup = document.getElementById('bmp180ControlPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'bmp180ControlPopup';
      popup.className = 'sensor-popup';
      document.body.appendChild(popup);
    }

    const currentTemp = comp.attrs.temperature ?? 24;
    const currentPres = comp.attrs.pressure ?? 101325;

    popup.innerHTML = `
      <div class="sensor-popup-header">
        <strong>BMP180 Sensor Controls</strong>
        <button class="modal-close-btn" onclick="document.getElementById('bmp180ControlPopup').style.display='none'">&times;</button>
      </div>
      <div class="sensor-popup-body">
        <div class="control-row">
          <label>Temperature: <span id="bmpTempDisp">${currentTemp}</span> °C</label>
          <input type="range" min="-40" max="85" step="0.5" value="${currentTemp}" id="bmpTempSlider">
        </div>
        <div class="control-row">
          <label>Pressure: <span id="bmpPresDisp">${currentPres}</span> Pa (${(currentPres/100).toFixed(1)} hPa)</label>
          <input type="range" min="30000" max="110000" step="100" value="${currentPres}" id="bmpPresSlider">
        </div>
      </div>
    `;

    popup.style.display = 'block';

    const tempSlider = popup.querySelector('#bmpTempSlider');
    const presSlider = popup.querySelector('#bmpPresSlider');

    tempSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      comp.attrs.temperature = val;
      if (comp.element) comp.element.temperature = val;
      popup.querySelector('#bmpTempDisp').textContent = val;
    };

    presSlider.oninput = (e) => {
      const val = parseInt(e.target.value, 10);
      comp.attrs.pressure = val;
      if (comp.element) comp.element.pressure = val;
      popup.querySelector('#bmpPresDisp').textContent = `${val} Pa (${(val/100).toFixed(1)} hPa)`;
    };
  }

  openMfrc522Popup(comp) {
    let popup = document.getElementById('mfrc522ControlPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'mfrc522ControlPopup';
      popup.className = 'sensor-popup mfrc-popup';
      document.body.appendChild(popup);
    }

    comp.activeCardIdx = comp.activeCardIdx || 0;
    comp.tagPresent = comp.tagPresent || 0;

    const renderPopupContent = () => {
      const customBlueUid = comp.attrs.uid || '01:02:03:04';
      const cards = [
        { id: 0, key: 'b', name: 'Blue Card', color: '#2563eb', uid: customBlueUid, type: 'MIFARE Classic 1K' },
        { id: 1, key: 'g', name: 'Green Card', color: '#16a34a', uid: '11:22:33:44', type: 'MIFARE Classic 1K' },
        { id: 2, key: 'y', name: 'Yellow Card', color: '#ca8a04', uid: '55:66:77:88', type: 'MIFARE Classic 1K' },
        { id: 3, key: 'r', name: 'Red Card', color: '#dc2626', uid: 'AA:BB:CC:DD', type: 'MIFARE Classic 1K' },
        { id: 4, key: 'n', name: 'NFC Tag', color: '#64748b', uid: '04:11:22:33:44:55:66', type: 'MIFARE Ultralight' },
        { id: 5, key: 'k', name: 'Key Fob', color: '#ea580c', uid: 'C0:FF:EE:99', type: 'MIFARE Mini' }
      ];

      popup.innerHTML = `
        <div class="sensor-popup-header">
          <strong>💳 MFRC522 RFID Card Selector</strong>
          <button class="modal-close-btn" id="mfrcCloseBtn">&times;</button>
        </div>
        <div class="sensor-popup-body">
          <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 8px 0;">Select a card preset to scan (or press shortcut key):</p>
          <div class="card-presets-grid" id="cardPresetsContainer" style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; max-height:180px; overflow-y:auto;"></div>

          <div style="margin-top:10px; padding:6px 8px; background:var(--bg-secondary, #f8fafc); border:1px solid #e2e8f0; border-radius:6px;">
            <label style="font-size:0.72rem; font-weight:600; color:var(--text); display:block; margin-bottom:4px;">Custom Blue Card UID (4 or 7 hex bytes):</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="mfrcBlueUidInput" value="${customBlueUid}" style="flex:1; padding:4px 8px; font-family:monospace; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px;" placeholder="01:02:03:04">
              <button class="btn btn-secondary btn-sm" id="mfrcApplyUidBtn">Apply</button>
            </div>
          </div>

          <div class="card-action-bar" style="margin-top:10px; display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" id="mfrcTapBtn" style="flex:1;">✋ Tap Card [T] (500ms)</button>
            <button class="btn ${comp.tagPresent ? 'btn-accent' : 'btn-secondary'} btn-sm" id="mfrcHoldBtn" style="flex:1;">
              ${comp.tagPresent ? '❌ Release Card' : '🔒 Hold Card'}
            </button>
          </div>

          <div style="margin-top:8px; font-size:0.68rem; color:var(--text-muted); display:flex; justify-content:space-between; border-top:1px solid #e2e8f0; padding-top:6px;">
            <span>Shortcuts: <b>B</b>lue, <b>G</b>reen, <b>Y</b>ellow, <b>R</b>ed, <b>N</b>FC, <b>K</b>ey fob</span>
            <span><b>T</b>: Tap</span>
          </div>
        </div>
      `;

      popup.style.display = 'block';

      const container = popup.querySelector('#cardPresetsContainer');
      cards.forEach(c => {
        const cardEl = document.createElement('div');
        cardEl.className = 'rfid-card-item' + (comp.activeCardIdx === c.id ? ' active' : '');
        cardEl.style.cssText = `border-left: 4px solid ${c.color}; padding: 6px 8px; background: #ffffff; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; border: 1px solid #e2e8f0; border-left: 4px solid ${c.color};`;
        if (comp.activeCardIdx === c.id) {
          cardEl.style.borderColor = c.color;
          cardEl.style.background = '#eff6ff';
        }
        cardEl.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:${c.color}; font-weight:bold; font-size:0.75rem;">${c.name}</span>
            <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">[${c.key.toUpperCase()}]</span>
          </div>
          <div style="font-family:monospace; font-size:0.7rem; color:#334155; margin-top:2px;">${c.uid}</div>
          <div style="font-size:0.65rem; color:#64748b;">${c.type}</div>
        `;
        cardEl.onclick = () => selectCard(c.id);
        container.appendChild(cardEl);
      });

      // Close button
      popup.querySelector('#mfrcCloseBtn').onclick = () => {
        popup.style.display = 'none';
        if (this._mfrcKeyHandler) {
          window.removeEventListener('keydown', this._mfrcKeyHandler);
          this._mfrcKeyHandler = null;
        }
      };

      // Custom UID Apply button
      popup.querySelector('#mfrcApplyUidBtn').onclick = () => {
        const input = popup.querySelector('#mfrcBlueUidInput');
        const val = (input.value || '').trim();
        if (val) {
          comp.attrs.uid = val;
          if (comp.element) {
            comp.element.uid = val;
            comp.element.setAttribute('uid', val);
          }
          this.showToast(`Updated Blue Card UID to ${val}`, 'success');
          renderPopupContent();
        }
      };

      // Tap button
      popup.querySelector('#mfrcTapBtn').onclick = () => doTap();

      // Hold button
      popup.querySelector('#mfrcHoldBtn').onclick = () => doToggleHold();
    };

    const selectCard = (idx) => {
      comp.activeCardIdx = idx;
      if (comp.element) {
        comp.element.card = idx;
      }
      renderPopupContent();
      this.showToast(`Selected Card #${idx}`, 'info');
    };

    const doTap = () => {
      comp.tagPresent = 1;
      if (comp.element) {
        comp.element.tagPresent = 1;
      }
      if (window.soundEngine) window.soundEngine.playRfidBeep();
      renderPopupContent();
      this.showToast(`Tapped Card on RFID Reader`, 'success');
      setTimeout(() => {
        comp.tagPresent = 0;
        if (comp.element) {
          comp.element.tagPresent = 0;
        }
        if (popup.style.display === 'block') {
          renderPopupContent();
        }
      }, 500);
    };

    const doToggleHold = () => {
      comp.tagPresent = comp.tagPresent ? 0 : 1;
      if (comp.element) {
        comp.element.tagPresent = comp.tagPresent;
      }
      if (comp.tagPresent && window.soundEngine) {
        window.soundEngine.playRfidBeep();
      }
      renderPopupContent();
      this.showToast(comp.tagPresent ? 'Card held on reader' : 'Card removed', 'info');
    };

    // Keyboard shortcuts listener
    if (this._mfrcKeyHandler) {
      window.removeEventListener('keydown', this._mfrcKeyHandler);
    }
    this._mfrcKeyHandler = (e) => {
      if (popup.style.display !== 'block') return;
      // Do not trigger if typing in text input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const key = e.key.toLowerCase();
      if (key === 'b') { e.preventDefault(); selectCard(0); }
      else if (key === 'g') { e.preventDefault(); selectCard(1); }
      else if (key === 'y') { e.preventDefault(); selectCard(2); }
      else if (key === 'r') { e.preventDefault(); selectCard(3); }
      else if (key === 'n') { e.preventDefault(); selectCard(4); }
      else if (key === 'k') { e.preventDefault(); selectCard(5); }
      else if (key === 't') { e.preventDefault(); doTap(); }
      else if (key === 'escape') {
        popup.style.display = 'none';
        window.removeEventListener('keydown', this._mfrcKeyHandler);
        this._mfrcKeyHandler = null;
      }
    };
    window.addEventListener('keydown', this._mfrcKeyHandler);

    renderPopupContent();
  }

  openResistorPopup(comp) {
    let popup = document.getElementById('resistorControlPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'resistorControlPopup';
      popup.className = 'sensor-popup resistor-popup';
      document.body.appendChild(popup);
    }

    const currentVal = comp.attrs.value || 220;

    popup.innerHTML = `
      <div class="sensor-popup-header">
        <strong>⚙️ Resistor Configuration</strong>
        <button class="modal-close-btn" onclick="document.getElementById('resistorControlPopup').style.display='none'">&times;</button>
      </div>
      <div class="sensor-popup-body">
        <div style="margin-bottom: 12px;">
          <label style="font-size:0.75rem; font-weight:600; color:var(--text); display:block; margin-bottom:4px;">Resistance Value:</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="resValInput" value="${currentVal}" min="1" max="10000000" style="flex:1; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-weight:600;">
            <select id="resMultiplierSelect" style="padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-weight:600;">
              <option value="1" ${currentVal < 1000 ? 'selected' : ''}>Ω (Ohms)</option>
              <option value="1000" ${currentVal >= 1000 && currentVal < 1000000 ? 'selected' : ''}>kΩ (kilo-Ohms)</option>
              <option value="1000000" ${currentVal >= 1000000 ? 'selected' : ''}>MΩ (mega-Ohms)</option>
            </select>
          </div>
        </div>

        <!-- Quick Presets -->
        <div style="margin-bottom: 12px;">
          <label style="font-size:0.72rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:4px;">Quick Presets:</label>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="100">100 Ω</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="220">220 Ω (LED)</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="330">330 Ω</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="1000">1 kΩ</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="4700">4.7 kΩ (I2C)</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="10000">10 kΩ (Pullup)</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="100000">100 kΩ</button>
            <button class="btn btn-secondary btn-sm res-preset-btn" data-val="1000000">1 MΩ</button>
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="saveResistorBtn" style="width:100%; padding:8px;">✔ Apply Resistance</button>
      </div>
    `;

    popup.style.display = 'block';

    const input = popup.querySelector('#resValInput');
    const mult = popup.querySelector('#resMultiplierSelect');

    popup.querySelectorAll('.res-preset-btn').forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(btn.dataset.val, 10);
        input.value = val;
        mult.value = '1';
      };
    });

    popup.querySelector('#saveResistorBtn').onclick = () => {
      let val = parseFloat(input.value) || 220;
      val = Math.round(val * parseInt(mult.value, 10));
      comp.attrs.value = val;
      if (comp.element) {
        comp.element.value = val;
      }
      popup.style.display = 'none';
      const formatted = val >= 1000000 ? (val/1000000)+'M' : (val >= 1000 ? (val/1000)+'k' : val);
      this.showToast(`Set resistor to ${formatted} Ω`, 'success');
    };
  }

  openLedPopup(comp) {
    let popup = document.getElementById('ledControlPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'ledControlPopup';
      popup.className = 'sensor-popup led-popup';
      document.body.appendChild(popup);
    }

    const colors = [
      { name: 'Red', hex: '#ef4444', key: 'red' },
      { name: 'Green', hex: '#22c55e', key: 'green' },
      { name: 'Blue', hex: '#3b82f6', key: 'blue' },
      { name: 'Yellow', hex: '#eab308', key: 'yellow' },
      { name: 'Orange', hex: '#f97316', key: 'orange' },
      { name: 'White', hex: '#f8fafc', key: 'white' }
    ];

    popup.innerHTML = `
      <div class="sensor-popup-header">
        <strong>💡 LED Color Selection</strong>
        <button class="modal-close-btn" onclick="document.getElementById('ledControlPopup').style.display='none'">&times;</button>
      </div>
      <div class="sensor-popup-body">
        <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 10px 0;">Select LED lens color:</p>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
          ${colors.map(c => `
            <button class="btn btn-secondary btn-sm led-color-btn" data-color="${c.key}" style="display:flex; align-items:center; gap:6px; padding:6px 10px; font-weight:600;">
              <span style="width:14px; height:14px; border-radius:50%; background:${c.hex}; border:1px solid rgba(0,0,0,0.2); display:inline-block;"></span>
              ${c.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    popup.style.display = 'block';

    popup.querySelectorAll('.led-color-btn').forEach(btn => {
      btn.onclick = () => {
        const color = btn.dataset.color;
        comp.attrs.color = color;
        if (comp.element) {
          comp.element.color = color;
        }
        popup.style.display = 'none';
        this.showToast(`Changed LED color to ${color.toUpperCase()}`, 'success');
      };
    });
  }

  openNeoPixelPopup(comp) {
    let popup = document.getElementById('neopixelControlPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'neopixelControlPopup';
      popup.className = 'sensor-popup neopixel-popup';
      document.body.appendChild(popup);
    }

    const currentPixels = comp.attrs.pixels || (comp.element?.pixels) || 16;

    popup.innerHTML = `
      <div class="sensor-popup-header">
        <strong>🌈 NeoPixel Ring Configuration</strong>
        <button class="modal-close-btn" onclick="document.getElementById('neopixelControlPopup').style.display='none'">&times;</button>
      </div>
      <div class="sensor-popup-body">
        <label style="font-size:0.75rem; font-weight:600; color:var(--text); display:block; margin-bottom:6px;">Number of RGB Pixels:</label>
        <div style="display:flex; gap:8px; margin-bottom:12px;">
          <button class="btn btn-secondary btn-sm ring-pix-btn ${currentPixels === 12 ? 'active' : ''}" data-pix="12">12 LEDs</button>
          <button class="btn btn-secondary btn-sm ring-pix-btn ${currentPixels === 16 ? 'active' : ''}" data-pix="16">16 LEDs</button>
          <button class="btn btn-secondary btn-sm ring-pix-btn ${currentPixels === 24 ? 'active' : ''}" data-pix="24">24 LEDs</button>
        </div>
      </div>
    `;

    popup.style.display = 'block';

    popup.querySelectorAll('.ring-pix-btn').forEach(btn => {
      btn.onclick = () => {
        const n = parseInt(btn.dataset.pix, 10);
        comp.attrs.pixels = n;
        if (comp.element) comp.element.pixels = n;
        popup.style.display = 'none';
        this.showToast(`Updated NeoPixel Ring to ${n} LEDs`, 'success');
      };
    });
  }

  // ==========================================
  // Default Initial Circuit
  // ==========================================
  loadDefaultCircuit() {
    this.clearCircuit();

    // 1. Arduino Uno
    const uno = this.addComponent('wokwi-arduino-uno', 50, 60);

    // 2. 220Ω Resistor
    const resistor = this.addComponent('wokwi-resistor', 370, 70, { value: 220 });

    // 3. Red LED
    const led = this.addComponent('wokwi-led', 490, 60, { color: 'red' });

    // 4. Connect Uno Pin 13 -> Resistor Terminal 1
    this.netlist.addWire(
      { compId: uno.id, pin: '13' },
      { compId: resistor.id, pin: '1' },
      '#38a169'
    );

    // 5. Connect Resistor Terminal 2 -> LED Anode (A)
    this.netlist.addWire(
      { compId: resistor.id, pin: '2' },
      { compId: led.id, pin: 'A' },
      '#38a169'
    );

    // 6. Connect LED Cathode (C) -> Uno GND.1
    this.netlist.addWire(
      { compId: led.id, pin: 'C' },
      { compId: uno.id, pin: 'GND.1' },
      '#1a202c' // Black ground wire
    );

    this.renderWires();
  }

  clearCircuit() {
    this.deselectAll();
    const wrappers = (this.viewport || this.board).querySelectorAll('.circuit-component');
    wrappers.forEach(w => w.remove());
    this.netlist.clear();
    this.renderWires();
  }

  showToast(msg, type = 'info') {
    if (window.ArduinoBlockly && ArduinoBlockly.showStatus) {
      ArduinoBlockly.showStatus(msg, type);
    }
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.CircuitCanvas = CircuitCanvas;
}
