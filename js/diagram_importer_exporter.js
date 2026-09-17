// js/diagram_importer_exporter.js — Wokwi diagram.json 2-Way Interoperability & Lab Report Generator
// Provides full compatibility with Wokwi's official diagram format and generates printable lab reports.

class DiagramImporterExporter {
  constructor(circuitCanvas) {
    this.canvas = circuitCanvas;
  }

  // Exports circuit to official Wokwi diagram.json
  exportWokwiJson() {
    if (!this.canvas || !this.canvas.netlist) return null;

    const netlist = this.canvas.netlist;
    const comps = netlist.getAllComponents();
    const wires = netlist.wires;

    const parts = comps.map(c => ({
      type: c.type,
      id: c.id,
      top: Math.round(c.y || 0),
      left: Math.round(c.x || 0),
      attrs: c.attrs || {}
    }));

    const colorHexToName = {
      '#1a202c': 'black',
      '#8b4513': 'brown',
      '#e53e3e': 'red',
      '#dd6b20': 'orange',
      '#d4af37': 'gold',
      '#38a169': 'green',
      '#3182ce': 'blue',
      '#805ad5': 'purple',
      '#808080': 'gray',
      '#ffffff': 'white',
      '#00ffff': 'cyan',
      '#32cd32': 'lime',
      '#ff00ff': 'magenta',
      '#d69e2e': 'yellow'
    };

    const connections = wires.map(w => {
      const fromPin = `${w.from.compId}:${w.from.pin}`;
      const toPin = `${w.to.compId}:${w.to.pin}`;
      const colorName = colorHexToName[w.color?.toLowerCase()] || w.color || 'green';
      return [fromPin, toPin, colorName, ['v0']];
    });

    const wokwiDiagram = {
      version: 1,
      author: 'IrieBlocky',
      editor: 'wokwi',
      parts,
      connections
    };

    return JSON.stringify(wokwiDiagram, null, 2);
  }

  downloadWokwiJson(filename = 'diagram.json') {
    const json = this.exportWokwiJson();
    if (!json) {
      alert('No active circuit to export.');
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Imports circuit from Wokwi diagram.json
  importWokwiJson(jsonString) {
    if (!this.canvas) return false;

    let data;
    try {
      data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return false;
    }

    if (!data.parts && !data.connections) {
      alert('Invalid Wokwi diagram: missing parts or connections array.');
      return false;
    }

    // Clear existing circuit
    this.canvas.clearCircuit();

    // Color name to hex map
    const colorNameToHex = {
      'black': '#1a202c',
      'brown': '#8b4513',
      'red': '#e53e3e',
      'orange': '#dd6b20',
      'gold': '#d4af37',
      'green': '#38a169',
      'blue': '#3182ce',
      'purple': '#805ad5',
      'violet': '#805ad5',
      'gray': '#808080',
      'white': '#ffffff',
      'cyan': '#00ffff',
      'lime': '#32cd32',
      'magenta': '#ff00ff',
      'yellow': '#d69e2e'
    };

    // 1. Add all parts
    const idMap = new Map();
    (data.parts || []).forEach(p => {
      const addedComp = this.canvas.addComponent(p.type, p.left || 100, p.top || 100, p.attrs || {});
      if (addedComp && p.id) {
        idMap.set(p.id, addedComp.id);
      }
    });

    // 2. Add all connections
    (data.connections || []).forEach(conn => {
      if (!Array.isArray(conn) || conn.length < 2) return;
      const [fromStr, toStr, colorName] = conn;

      const fromParts = fromStr.split(':');
      const toParts = toStr.split(':');
      if (fromParts.length < 2 || toParts.length < 2) return;

      const fromCompId = idMap.get(fromParts[0]) || fromParts[0];
      const fromPin = fromParts[1];
      const toCompId = idMap.get(toParts[0]) || toParts[0];
      const toPin = toParts[1];

      const wireColor = colorNameToHex[colorName?.toLowerCase()] || colorName || '#38a169';

      this.canvas.netlist.addWire(
        { compId: fromCompId, pin: fromPin },
        { compId: toCompId, pin: toPin },
        wireColor
      );
    });

    this.canvas.renderWires();
    if (window.circuitHealthChecker) {
      window.circuitHealthChecker.checkHealth();
    }
    return true;
  }

  showImportModal() {
    let modal = document.getElementById('wokwiImportModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'wokwiImportModal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 13000;
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#ffffff; width:540px; max-width:92vw; border-radius:12px; box-shadow:0 25px 50px rgba(0,0,0,0.3); overflow:hidden; border:1px solid #cbd5e1; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">&#x1F504;</span>
            <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:#1e293b;">Import Wokwi diagram.json</h3>
          </div>
          <button style="border:none; background:transparent; font-size:1.2rem; cursor:pointer; color:#64748b;" onclick="document.getElementById('wokwiImportModal').style.display='none'">&times;</button>
        </div>
        <div style="padding:16px 18px; display:flex; flex-direction:column; gap:12px;">
          <p style="font-size:0.82rem; color:#64748b; margin:0;">
            Paste the contents of any Wokwi <code>diagram.json</code> below, or choose a file from your computer:
          </p>
          <input type="file" id="wokwiFileInput" accept=".json" style="font-size:0.8rem;">
          <textarea id="wokwiJsonText" placeholder='{\n  "version": 1,\n  "parts": [...],\n  "connections": [...]\n}' style="width:100%; height:180px; font-family:monospace; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:6px; padding:8px; box-sizing:border-box; outline:none;"></textarea>
        </div>
        <div style="padding:12px 18px; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('wokwiImportModal').style.display='none'">Cancel</button>
          <button class="btn btn-primary btn-sm" onclick="diagramIO.executeImport()">Import Circuit</button>
        </div>
      </div>
    `;

    const fileInput = document.getElementById('wokwiFileInput');
    const textInput = document.getElementById('wokwiJsonText');
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          textInput.value = evt.target.result;
        };
        reader.readAsText(file);
      }
    };

    modal.style.display = 'flex';
  }

  executeImport() {
    const textInput = document.getElementById('wokwiJsonText');
    if (!textInput || !textInput.value.trim()) {
      alert('Please paste or select a diagram.json file.');
      return;
    }
    const success = this.importWokwiJson(textInput.value);
    if (success) {
      document.getElementById('wokwiImportModal').style.display = 'none';
    }
  }

  // Generates complete engineering Lab Report (PDF / Print)
  generateLabReport() {
    const code = window.ArduinoBlockly ? ArduinoBlockly.generateCode() : '// No code generated';
    const bomItems = window.CircuitSchematic && this.canvas?.netlist
      ? CircuitSchematic.generateBom(this.canvas.netlist)
      : [];

    let bomRows = bomItems.map(item => `
      <tr>
        <td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:700;">${item.name}</td>
        <td style="padding:6px 10px; border:1px solid #cbd5e1; text-align:center;">${item.quantity}</td>
        <td style="padding:6px 10px; border:1px solid #cbd5e1;">${item.component}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this site to generate your lab report.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Engineering Lab Report — IrieBlocky</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
          h1 { color: #00979d; border-bottom: 2px solid #00979d; padding-bottom: 8px; margin-bottom: 4px; }
          .meta { font-size: 0.85rem; color: #64748b; margin-bottom: 25px; }
          h2 { color: #334155; font-size: 1.15rem; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
          th { background: #f1f5f9; padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; }
          pre { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; font-size: 0.8rem; font-family: 'Courier New', monospace; overflow-x: auto; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="background:#00979d; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">&#x2399; Print / Save as PDF</button>
        </div>
        <h1>Arduino Engineering Lab Report</h1>
        <div class="meta">
          <strong>Generated by IrieBlocky</strong> &bull; Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        </div>

        <h2>1. Bill of Materials (BOM)</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Designator</th>
              <th style="width: 15%; text-align:center;">Quantity</th>
              <th>Component Description</th>
            </tr>
          </thead>
          <tbody>
            ${bomRows || '<tr><td colspan="3" style="text-align:center; padding:10px;">No components in netlist.</td></tr>'}
          </tbody>
        </table>

        <h2>2. Arduino Embedded C++ Source Code</h2>
        <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>

        <div style="margin-top: 40px; font-size: 0.75rem; color: #94a3b8; text-align: center;">
          Document generated automatically with IrieBlocky Embedded Systems Studio
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

window.DiagramImporterExporter = DiagramImporterExporter;
