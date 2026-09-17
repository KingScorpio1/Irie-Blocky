// Circuit Netlist & Graph Manager for IrieBlocky
class CircuitNetlist {
  constructor() {
    this.components = new Map();
    this.wires = [];
  }

  addComponent(component) {
    this.components.set(component.id, component);
  }

  removeComponent(compId) {
    this.components.delete(compId);
    // Remove all wires connected to this component
    this.wires = this.wires.filter(
      w => w.from.compId !== compId && w.to.compId !== compId
    );
  }

  getComponent(compId) {
    return this.components.get(compId);
  }

  getAllComponents() {
    return Array.from(this.components.values());
  }

  addWire(from, to, color = '#e53e3e', bendPoints = []) {
    // Prevent self-connection to same pin
    if (from.compId === to.compId && from.pin === to.pin) {
      return null;
    }

    // Check if wire already exists
    const exists = this.wires.some(
      w => (w.from.compId === from.compId && w.from.pin === from.pin &&
            w.to.compId === to.compId && w.to.pin === to.pin) ||
           (w.from.compId === to.compId && w.from.pin === to.pin &&
            w.to.compId === from.compId && w.to.pin === from.pin)
    );
    if (exists) return null;

    const wire = {
      id: 'wire_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      from: { compId: from.compId, pin: String(from.pin) },
      to: { compId: to.compId, pin: String(to.pin) },
      color: color,
      bendPoints: Array.isArray(bendPoints) ? bendPoints.slice() : []
    };

    this.wires.push(wire);
    return wire;
  }

  removeWire(wireId) {
    const idx = this.wires.findIndex(w => w.id === wireId);
    if (idx !== -1) {
      this.wires.splice(idx, 1);
      return true;
    }
    return false;
  }

  getWires() {
    return this.wires;
  }

  clear() {
    this.components.clear();
    this.wires = [];
  }

  // Find all wires connected to a specific component and pin
  getWiresForPin(compId, pin) {
    const p = String(pin);
    return this.wires.filter(
      w => (w.from.compId === compId && w.from.pin === p) ||
           (w.to.compId === compId && w.to.pin === p)
    );
  }

  // Trace electrical connectivity to find connected Arduino Uno pin
  // (handles direct connection or through a 2-pin resistor)
  findConnectedUnoPin(targetCompId, targetPin, visited = new Set()) {
    const key = `${targetCompId}:${targetPin}`;
    if (visited.has(key)) return null;
    visited.add(key);

    const comp = this.components.get(targetCompId);
    if (!comp) return null;

    // If target itself is an Arduino Uno, return its pin
    if (comp.type === 'wokwi-arduino-uno') {
      return { unoId: comp.id, pin: targetPin };
    }

    const connectedWires = this.getWiresForPin(targetCompId, targetPin);
    for (const wire of connectedWires) {
      const otherEnd = (wire.from.compId === targetCompId && wire.from.pin === String(targetPin))
        ? wire.to
        : wire.from;

      const otherComp = this.components.get(otherEnd.compId);
      if (!otherComp) continue;

      if (otherComp.type === 'wokwi-arduino-uno') {
        return { unoId: otherComp.id, pin: otherEnd.pin };
      }

      // If connected to a resistor, trace through the other terminal!
      if (otherComp.type === 'wokwi-resistor') {
        const otherResistorPin = (otherEnd.pin === '1') ? '2' : '1';
        const res = this.findConnectedUnoPin(otherEnd.compId, otherResistorPin, visited);
        if (res) return res;
      }
    }

    return null;
  }

  // Export diagram in a clean JSON format compatible with Wokwi diagram.json
  exportDiagram() {
    const parts = [];
    for (const [id, c] of this.components.entries()) {
      parts.push({
        type: c.type,
        id: c.id,
        top: Math.round(c.y),
        left: Math.round(c.x),
        rotate: c.rotation || 0,
        attrs: c.attrs || {}
      });
    }

    const connections = this.wires.map(w => [
      `${w.from.compId}:${w.from.pin}`,
      `${w.to.compId}:${w.to.pin}`,
      w.color,
      []
    ]);

    return {
      version: 1,
      author: 'IrieBlocky User',
      editor: 'wokwi',
      parts: parts,
      connections: connections
    };
  }

  // Import diagram JSON
  importDiagram(diagramData) {
    this.clear();
    if (!diagramData || !diagramData.parts) return;

    for (const part of diagramData.parts) {
      this.components.set(part.id, {
        id: part.id,
        type: part.type,
        x: part.left || 50,
        y: part.top || 50,
        rotation: part.rotate || 0,
        attrs: part.attrs || {}
      });
    }

    if (Array.isArray(diagramData.connections)) {
      for (const conn of diagramData.connections) {
        if (!Array.isArray(conn) || conn.length < 2) continue;
        const [fromPart, toPart, color] = conn;
        const [fromId, fromPin] = fromPart.split(':');
        const [toId, toPin] = toPart.split(':');
        if (fromId && fromPin && toId && toPin) {
          this.addWire(
            { compId: fromId, pin: fromPin },
            { compId: toId, pin: toPin },
            color || '#38a169'
          );
        }
      }
    }
  }
}

// Export for browser and node
if (typeof window !== 'undefined') {
  window.CircuitNetlist = CircuitNetlist;
}
if (typeof module !== 'undefined') {
  module.exports = CircuitNetlist;
}
