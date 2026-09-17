// js/circuit_schematic.js — Schematic Diagram & Bill of Materials (BOM) Generator for IrieBlocky
// Provides: CircuitSchematic class
// Features: Dynamic electrical schematic generation, IEEE/IEC symbols,
//           orthogonal net routing, solder junction dots, engineering title sheet,
//           BOM table generation, CSV export, and SVG/PDF download.

class CircuitSchematic {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  // Generates Bill of Materials (BOM) data from netlist
  static getBom(netlist) {
    if (!netlist) return [];
    const comps = netlist.getAllComponents();
    const groups = new Map(); // key -> { designators: [], count, type, name, spec }

    let rCount = 0, dCount = 0, uCount = 0, sCount = 0, rvCount = 0, bzCount = 0, mCount = 0;

    comps.forEach(c => {
      let key, name, des;
      const type = c.type;

      if (type === 'wokwi-arduino-uno') {
        uCount++;
        des = `U${uCount}`;
        key = 'arduino-uno';
        name = 'Arduino Uno R3';
      } else if (type === 'wokwi-arduino-nano') {
        uCount++;
        des = `U${uCount}`;
        key = 'arduino-nano';
        name = 'Arduino Nano';
      } else if (type === 'wokwi-arduino-mega') {
        uCount++;
        des = `U${uCount}`;
        key = 'arduino-mega';
        name = 'Arduino Mega 2560';
      } else if (type === 'wokwi-resistor') {
        rCount++;
        des = `R${rCount}`;
        const val = c.attrs?.value || 220;
        key = `resistor-${val}`;
        name = `${val} \u03A9 Resistor`;
      } else if (type === 'wokwi-led') {
        dCount++;
        des = `D${dCount}`;
        const color = (c.attrs?.color || 'red').toLowerCase();
        const capColor = color.charAt(0).toUpperCase() + color.slice(1);
        key = `led-${color}`;
        name = `${capColor} LED`;
      } else if (type === 'wokwi-pushbutton') {
        sCount++;
        des = `S${sCount}`;
        key = 'pushbutton';
        name = 'Pushbutton (Tactile Switch)';
      } else if (type === 'wokwi-potentiometer') {
        rvCount++;
        des = `RV${rvCount}`;
        key = 'potentiometer';
        name = '10k \u03A9 Potentiometer';
      } else if (type === 'wokwi-buzzer') {
        bzCount++;
        des = `BZ${bzCount}`;
        key = 'buzzer';
        name = 'Piezo Buzzer';
      } else if (type === 'wokwi-servo') {
        mCount++;
        des = `M${mCount}`;
        key = 'servo';
        name = 'Micro Servo Motor (SG90)';
      } else if (type === 'board-bmp180') {
        uCount++;
        des = `U${uCount}`;
        key = 'bmp180';
        name = 'BMP180 Barometric Pressure & Temp Sensor';
      } else if (type === 'board-mfrc522') {
        uCount++;
        des = `U${uCount}`;
        key = 'mfrc522';
        name = 'MFRC522 13.56 MHz RFID Reader';
      } else if (type === 'wokwi-hc-sr04') {
        uCount++;
        des = `U${uCount}`;
        key = 'hc-sr04';
        name = 'HC-SR04 Ultrasonic Distance Sensor';
      } else if (type === 'wokwi-dht22') {
        uCount++;
        des = `U${uCount}`;
        key = 'dht22';
        name = 'DHT22 Temperature & Humidity Sensor';
      } else if (type === 'wokwi-pir-motion-sensor') {
        uCount++;
        des = `U${uCount}`;
        key = 'pir';
        name = 'PIR Motion Sensor Module';
      } else {
        uCount++;
        des = `U${uCount}`;
        key = type;
        name = type.replace(/^(wokwi-|board-)/, '').toUpperCase();
      }

      if (!groups.has(key)) {
        groups.set(key, { name: name, designators: [], quantity: 0 });
      }
      const g = groups.get(key);
      g.designators.push(des);
      g.quantity++;
    });

    return Array.from(groups.values()).map(g => ({
      name: g.designators.join(', '),
      quantity: g.quantity,
      component: g.name
    }));
  }

  // Renders the BOM Table inside container
  static renderBomTable(netlist, tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    const items = CircuitSchematic.getBom(netlist);
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:20px;">No components in circuit. Add parts to see BOM.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const formattedDes = item.name.split(', ').join('<br>');
      tr.innerHTML = `
        <td class="bom-designator">${formattedDes}</td>
        <td class="bom-qty">${item.quantity}</td>
        <td class="bom-comp-name">${item.component}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Exports BOM to CSV file download
  static exportCsv(netlist, filename = 'components.csv') {
    const items = CircuitSchematic.getBom(netlist);
    let csv = 'Name,Quantity,Component\r\n';
    items.forEach(item => {
      csv += `"${item.name}",${item.quantity},"${item.component}"\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // Schematic Diagram SVG Generator
  // =========================================================================
  static renderSchematic(netlist, svgContainerId, options = {}) {
    const container = document.getElementById(svgContainerId);
    if (!container) return;

    const comps = netlist.getAllComponents();
    const wires = netlist.getWires();

    const width = 1200;
    const height = 800;

    let svg = `<svg id="schematicSvgCanvas" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; background:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <defs>
        <!-- Diode arrow markers -->
        <marker id="photonArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
        </marker>
        <filter id="schematicShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.08"/>
        </filter>
      </defs>
    `;

    // 1. Engineering Border Frame (Matching Tinkercad Screenshot 081349)
    const margin = 20;
    const innerMargin = 30;
    const redColor = '#dc2626';

    // Outer and inner borders
    svg += `
      <!-- Outer Border -->
      <rect x="${margin}" y="${margin}" width="${width - margin * 2}" height="${height - margin * 2}" fill="none" stroke="${redColor}" stroke-width="1.8" />
      <rect x="${innerMargin}" y="${innerMargin}" width="${width - innerMargin * 2}" height="${height - innerMargin * 2}" fill="none" stroke="${redColor}" stroke-width="0.9" />
    `;

    // Zone grid markers (A to E vertically, 1 to 6 horizontally)
    const cols = 6;
    const colW = (width - innerMargin * 2) / cols;
    for (let i = 1; i <= cols; i++) {
      const cx = innerMargin + colW * (i - 0.5);
      svg += `<text x="${cx}" y="${innerMargin - 4}" fill="${redColor}" font-size="10" font-weight="600" text-anchor="middle">${i}</text>`;
      svg += `<text x="${cx}" y="${height - innerMargin + 10}" fill="${redColor}" font-size="10" font-weight="600" text-anchor="middle">${i}</text>`;
      if (i < cols) {
        const divX = innerMargin + colW * i;
        svg += `<line x1="${divX}" y1="${margin}" x2="${divX}" y2="${innerMargin}" stroke="${redColor}" stroke-width="0.8" />`;
        svg += `<line x1="${divX}" y1="${height - innerMargin}" x2="${divX}" y2="${height - margin}" stroke="${redColor}" stroke-width="0.8" />`;
      }
    }

    const rows = ['A', 'B', 'C', 'D', 'E'];
    const rowH = (height - innerMargin * 2) / rows.length;
    rows.forEach((r, i) => {
      const cy = innerMargin + rowH * (i + 0.5);
      svg += `<text x="${innerMargin - 8}" y="${cy + 3}" fill="${redColor}" font-size="10" font-weight="600" text-anchor="middle">${r}</text>`;
      svg += `<text x="${width - innerMargin + 8}" y="${cy + 3}" fill="${redColor}" font-size="10" font-weight="600" text-anchor="middle">${r}</text>`;
      if (i > 0) {
        const divY = innerMargin + rowH * i;
        svg += `<line x1="${margin}" y1="${divY}" x2="${innerMargin}" y2="${divY}" stroke="${redColor}" stroke-width="0.8" />`;
        svg += `<line x1="${width - innerMargin}" y1="${divY}" x2="${width - margin}" y2="${divY}" stroke="${redColor}" stroke-width="0.8" />`;
      }
    });

    // Title Block (Bottom Right)
    const tbW = 280;
    const tbH = 65;
    const tbX = width - innerMargin - tbW;
    const tbY = height - innerMargin - tbH;
    const today = new Date().toLocaleDateString('en-US');

    svg += `
      <!-- Title Block -->
      <g id="titleBlock">
        <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" fill="#ffffff" stroke="${redColor}" stroke-width="1.2" />
        <line x1="${tbX}" y1="${tbY + 32}" x2="${tbX + tbW}" y2="${tbY + 32}" stroke="${redColor}" stroke-width="0.8" />
        <line x1="${tbX + 170}" y1="${tbY + 32}" x2="${tbX + 170}" y2="${tbY + tbH}" stroke="${redColor}" stroke-width="0.8" />
        
        <text x="${tbX + 8}" y="${tbY + 18}" fill="${redColor}" font-size="11" font-weight="700">Title:  Editing Components</text>
        <text x="${tbX + 8}" y="${tbY + 50}" fill="${redColor}" font-size="10">Date:  ${today}</text>
        <text x="${tbX + 180}" y="${tbY + 50}" fill="${redColor}" font-size="10">Sheet:  1/1</text>
        <text x="${innerMargin + 10}" y="${height - innerMargin - 10}" fill="${redColor}" font-size="10" font-weight="600">Made with IrieBlocky\u00AE</text>
      </g>
    `;

    // 2. Schematic Symbols & Placement
    // We map each component to its schematic position and terminal coordinates
    const compTerminals = new Map(); // `${compId}:${pinName}` -> { x, y }
    const netColor = '#059669'; // Green schematic net lines (matching Screenshot 081349)

    // Center Arduino Uno in middle
    const uno = comps.find(c => c.type.includes('arduino'));
    const unoX = 600;
    const unoY = 410;

    if (uno) {
      svg += CircuitSchematic._renderUnoSymbol(uno, unoX, unoY, compTerminals);
    }

    // Place peripheral components (Resistors, LEDs, Sensors, etc.)
    const peripherals = comps.filter(c => !c.type.includes('arduino'));
    let rIdx = 1, dIdx = 1, sIdx = 1;

    // Distribute around Uno
    const count = peripherals.length;
    peripherals.forEach((comp, idx) => {
      let x, y;
      if (comp.type === 'wokwi-resistor') {
        // Place above or to the side of Uno
        const offset = (rIdx - 1) * 75;
        x = 420 + offset;
        y = 300;
        svg += CircuitSchematic._renderResistorSymbol(comp, `R${rIdx}`, x, y, compTerminals);
        rIdx++;
      } else if (comp.type === 'wokwi-led') {
        const offset = (dIdx - 1) * 75;
        x = 760 + offset;
        y = 300;
        svg += CircuitSchematic._renderLedSymbol(comp, `D${dIdx}`, x, y, compTerminals);
        dIdx++;
      } else if (comp.type === 'board-bmp180') {
        x = 380;
        y = 420;
        svg += CircuitSchematic._renderSensorBlock(comp, 'BMP180', ['VCC', 'GND', 'SDA', 'SCL'], x, y, compTerminals);
      } else if (comp.type === 'board-mfrc522') {
        x = 830;
        y = 420;
        svg += CircuitSchematic._renderSensorBlock(comp, 'MFRC522', ['3.3V', 'RST', 'GND', 'MISO', 'MOSI', 'SCK', 'SDA'], x, y, compTerminals);
      } else {
        // Generic box symbol
        const ang = (idx / Math.max(count, 1)) * Math.PI * 2;
        x = unoX + Math.cos(ang) * 280;
        y = unoY + Math.sin(ang) * 200;
        svg += CircuitSchematic._renderGenericSymbol(comp, `U${idx + 2}`, x, y, compTerminals);
      }
    });

    // 3. Ground Symbol (U1_GND) below Uno
    const gndX = 600;
    const gndY = 540;
    svg += `
      <!-- Ground Symbol -->
      <g id="gndSymbol">
        <line x1="${gndX}" y1="${gndY - 15}" x2="${gndX}" y2="${gndY}" stroke="${redColor}" stroke-width="1.2" />
        <path d="M ${gndX - 12} ${gndY} L ${gndX + 12} ${gndY} M ${gndX - 7} ${gndY + 4} L ${gndX + 7} ${gndY + 4} M ${gndX - 2} ${gndY + 8} L ${gndX + 2} ${gndY + 8}" stroke="${redColor}" stroke-width="1.2" fill="none" />
        <text x="${gndX}" y="${gndY + 20}" fill="${redColor}" font-size="9" font-weight="600" text-anchor="middle">U1_GND</text>
      </g>
    `;

    // 4. Render Orthogonal Schematic Nets (Green Lines & Junctions)
    const junctionPoints = new Map(); // `${x},${y}` -> count

    wires.forEach(wire => {
      const fromKey = `${wire.from.compId}:${wire.from.pin}`;
      const toKey = `${wire.to.compId}:${wire.to.pin}`;

      let p1 = compTerminals.get(fromKey);
      let p2 = compTerminals.get(toKey);

      // Handle ground connections
      if (!p1 && wire.from.pin.toUpperCase().includes('GND')) p1 = { x: gndX, y: gndY - 15 };
      if (!p2 && wire.to.pin.toUpperCase().includes('GND')) p2 = { x: gndX, y: gndY - 15 };

      if (p1 && p2) {
        // Build right-angle schematic path
        const pathData = CircuitSchematic._calculateSchematicNet(p1, p2);
        svg += `<path d="${pathData}" fill="none" stroke="${netColor}" stroke-width="1.5" stroke-linecap="square" />`;

        // Track shared junctions
        const k1 = `${p1.x},${p1.y}`;
        const k2 = `${p2.x},${p2.y}`;
        junctionPoints.set(k1, (junctionPoints.get(k1) || 0) + 1);
        junctionPoints.set(k2, (junctionPoints.get(k2) || 0) + 1);
      }
    });

    // Render solder junction dots where nets meet
    junctionPoints.forEach((count, key) => {
      if (count >= 2) {
        const [jx, jy] = key.split(',').map(Number);
        svg += `<circle cx="${jx}" cy="${jy}" r="3" fill="${netColor}" />`;
      }
    });

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // Exports Schematic SVG as a downloaded file
  static downloadSvg(filename = 'schematic.svg') {
    const svgEl = document.getElementById('schematicSvgCanvas');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Exports Schematic SVG as high-quality vector PDF via browser print
  static downloadPdf() {
    const svgEl = document.getElementById('schematicSvgCanvas');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);

    const printWin = window.open('', '_blank', 'width=1250,height=850');
    if (!printWin) {
      alert('Please allow popups to generate and print PDF schematic.');
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Schematic View - IrieBlocky</title>
          <style>
            @page { size: landscape; margin: 0; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #ffffff; }
            svg { width: 100vw; height: 100vh; }
          </style>
        </head>
        <body>
          ${source}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }

  // Helper: Renders Arduino Uno Symbol
  static _renderUnoSymbol(comp, x, y, terminals) {
    const w = 110;
    const h = 200;
    const rx = x - w / 2;
    const ry = y - h / 2;
    const red = '#dc2626';

    let s = `
      <g id="schematicUno">
        <text x="${x}" y="${ry - 8}" fill="${red}" font-size="10" font-weight="700" text-anchor="middle">U1</text>
        <rect x="${rx}" y="${ry}" width="${w}" height="${h}" fill="#ffffff" stroke="${red}" stroke-width="1.4" />
        <text x="${x}" y="${ry + 75}" fill="${red}" font-size="9" font-weight="700" text-anchor="middle">Arduino</text>
        <text x="${x}" y="${ry + 88}" fill="${red}" font-size="10" font-weight="700" text-anchor="middle">UNO</text>
    `;

    // Left pins
    const leftPins = ['VIN', '5V', '3.3V', 'AREF', 'IOREF', 'RES', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'GND'];
    const lStep = (h - 20) / (leftPins.length - 1);
    leftPins.forEach((pin, i) => {
      const py = ry + 12 + i * lStep;
      // Stub line
      s += `<line x1="${rx - 12}" y1="${py}" x2="${rx}" y2="${py}" stroke="${red}" stroke-width="1.0" />`;
      s += `<text x="${rx + 5}" y="${py + 3}" fill="${red}" font-size="7.5" font-family="ui-monospace, monospace">${pin}</text>`;

      terminals.set(`${comp.id}:${pin}`, { x: rx - 12, y: py });
      if (pin === 'GND') {
        terminals.set(`${comp.id}:GND.1`, { x: rx - 12, y: py });
        terminals.set(`${comp.id}:GND.2`, { x: rx - 12, y: py });
        terminals.set(`${comp.id}:GND.3`, { x: rx - 12, y: py });
      }
    });

    // Right pins
    const rightPins = ['RX', 'TX', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'SDA', 'SCL'];
    const rStep = (h - 20) / (rightPins.length - 1);
    rightPins.forEach((pin, i) => {
      const py = ry + 12 + i * rStep;
      s += `<line x1="${rx + w}" y1="${py}" x2="${rx + w + 12}" y2="${py}" stroke="${red}" stroke-width="1.0" />`;
      s += `<text x="${rx + w - 5}" y="${py + 3}" fill="${red}" font-size="7.5" font-family="ui-monospace, monospace" text-anchor="end">${pin}</text>`;

      terminals.set(`${comp.id}:${pin}`, { x: rx + w + 12, y: py });
      // Map numerical pin names ('13', '12', etc.)
      const numPin = pin.replace('D', '');
      terminals.set(`${comp.id}:${numPin}`, { x: rx + w + 12, y: py });
    });

    s += '</g>';
    return s;
  }

  // Helper: Renders Resistor Symbol (R1, R2, ...)
  static _renderResistorSymbol(comp, designator, x, y, terminals) {
    const rw = 28;
    const rh = 12;
    const red = '#dc2626';
    const val = comp.attrs?.value || 220;

    terminals.set(`${comp.id}:1`, { x: x - rw / 2 - 12, y: y });
    terminals.set(`${comp.id}:2`, { x: x + rw / 2 + 12, y: y });

    return `
      <g id="sch_${comp.id}">
        <text x="${x}" y="${y - rh / 2 - 4}" fill="${red}" font-size="9" font-weight="700" text-anchor="middle">${designator}</text>
        <text x="${x}" y="${y + rh / 2 + 11}" fill="${red}" font-size="8" text-anchor="middle">${val}</text>
        <!-- Leads -->
        <line x1="${x - rw / 2 - 12}" y1="${y}" x2="${x - rw / 2}" y2="${y}" stroke="${red}" stroke-width="1.0" />
        <line x1="${x + rw / 2}" y1="${y}" x2="${x + rw / 2 + 12}" y2="${y}" stroke="${red}" stroke-width="1.0" />
        <!-- IEC Box -->
        <rect x="${x - rw / 2}" y="${y - rh / 2}" width="${rw}" height="${rh}" fill="#ffffff" stroke="${red}" stroke-width="1.2" />
      </g>
    `;
  }

  // Helper: Renders LED Symbol (D1, D2, ...)
  static _renderLedSymbol(comp, designator, x, y, terminals) {
    const red = '#dc2626';
    const color = (comp.attrs?.color || 'BLUE').toUpperCase();

    terminals.set(`${comp.id}:A`, { x: x - 20, y: y });
    terminals.set(`${comp.id}:C`, { x: x + 20, y: y });

    return `
      <g id="sch_${comp.id}">
        <text x="${x}" y="${y - 14}" fill="${red}" font-size="9" font-weight="700" text-anchor="middle">${designator}</text>
        <text x="${x}" y="${y + 20}" fill="${red}" font-size="8" text-anchor="middle">${color}</text>
        <!-- Leads -->
        <line x1="${x - 20}" y1="${y}" x2="${x - 8}" y2="${y}" stroke="${red}" stroke-width="1.0" />
        <line x1="${x + 8}" y1="${y}" x2="${x + 20}" y2="${y}" stroke="${red}" stroke-width="1.0" />
        <!-- Diode Triangle & Bar -->
        <polygon points="${x - 8},${y - 8} ${x - 8},${y + 8} ${x + 4},${y}" fill="${red}" stroke="${red}" stroke-width="1.0" />
        <line x1="${x + 5}" y1="${y - 8}" x2="${x + 5}" y2="${y + 8}" stroke="${red}" stroke-width="1.4" />
        <!-- Photon Arrows -->
        <line x1="${x + 2}" y1="${y - 9}" x2="${x + 8}" y2="${y - 15}" stroke="${red}" stroke-width="1.0" marker-end="url(#photonArrow)" />
        <line x1="${x + 7}" y1="${y - 6}" x2="${x + 13}" y2="${y - 12}" stroke="${red}" stroke-width="1.0" marker-end="url(#photonArrow)" />
      </g>
    `;
  }

  // Helper: Renders Generic Sensor Block (BMP180, MFRC522, etc.)
  static _renderSensorBlock(comp, name, pins, x, y, terminals) {
    const red = '#dc2626';
    const bw = 70;
    const bh = pins.length * 16 + 20;

    let s = `
      <g id="sch_${comp.id}">
        <rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" fill="#ffffff" stroke="${red}" stroke-width="1.2" />
        <text x="${x}" y="${y - bh / 2 + 12}" fill="${red}" font-size="8.5" font-weight="700" text-anchor="middle">${name}</text>
    `;

    pins.forEach((p, i) => {
      const py = y - bh / 2 + 22 + i * 16;
      const isLeft = i % 2 === 0;
      const tx = isLeft ? x - bw / 2 : x + bw / 2;
      const lx = isLeft ? tx - 10 : tx + 10;

      s += `<line x1="${tx}" y1="${py}" x2="${lx}" y2="${py}" stroke="${red}" stroke-width="1.0" />`;
      s += `<text x="${isLeft ? tx + 4 : tx - 4}" y="${py + 3}" fill="${red}" font-size="7" ${isLeft ? '' : 'text-anchor="end"'}>${p}</text>`;
      terminals.set(`${comp.id}:${p}`, { x: lx, y: py });
    });

    s += '</g>';
    return s;
  }

  static _renderGenericSymbol(comp, designator, x, y, terminals) {
    const red = '#dc2626';
    const w = 50;
    const h = 40;
    terminals.set(`${comp.id}:1`, { x: x - w / 2 - 10, y: y });
    terminals.set(`${comp.id}:2`, { x: x + w / 2 + 10, y: y });

    return `
      <g id="sch_${comp.id}">
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="#ffffff" stroke="${red}" stroke-width="1.2" />
        <text x="${x}" y="${y}" fill="${red}" font-size="8" font-weight="700" text-anchor="middle">${designator}</text>
      </g>
    `;
  }

  // Calculate clean orthogonal schematic net
  static _calculateSchematicNet(p1, p2) {
    const midX = Math.round((p1.x + p2.x) / 2);
    // Simple 3-segment Manhattan route
    return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.CircuitSchematic = CircuitSchematic;
}
