// test_schematic_and_canvas.js
// Verification suite for non-bulky electronics, neat wiring, schematic view, and BOM

const fs = require('fs');
const path = require('path');

// Mock browser globals for Node test environment
global.window = global;
global.document = {
  getElementById: (id) => {
    return {
      id: id,
      innerHTML: '',
      style: {},
      appendChild: () => {},
      querySelectorAll: () => []
    };
  },
  createElement: (tag) => {
    return {
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      addEventListener: () => {},
      appendChild: () => {},
      querySelectorAll: () => [],
      querySelector: () => null,
      dataset: {}
    };
  },
  createElementNS: (ns, tag) => {
    return {
      tagName: tag,
      setAttribute: () => {},
      classList: { add: () => {}, remove: () => {} },
      addEventListener: () => {}
    };
  }
};

// Load modules
require('./js/circuit_netlist.js');
require('./js/circuit_canvas.js');
require('./js/circuit_schematic.js');
require('./js/simulation_engine.js');

console.log('--- 1. Testing CircuitNetlist & Components ---');
const netlist = new CircuitNetlist();

const mockWrap = { querySelector: () => null };
const uno = { id: 'part_uno_1', type: 'wokwi-arduino-uno', x: 140, y: 220, attrs: {}, domWrapper: mockWrap };
const r1 = { id: 'part_res_1', type: 'wokwi-resistor', x: 430, y: 110, attrs: { value: 200 }, domWrapper: mockWrap };
const r2 = { id: 'part_res_2', type: 'wokwi-resistor', x: 430, y: 145, attrs: { value: 200 }, domWrapper: mockWrap };
const r3 = { id: 'part_res_3', type: 'wokwi-resistor', x: 430, y: 180, attrs: { value: 200 }, domWrapper: mockWrap };
const d1 = { id: 'part_led_1', type: 'wokwi-led', x: 540, y: 210, attrs: { color: 'blue' }, domWrapper: mockWrap };
const d2 = { id: 'part_led_2', type: 'wokwi-led', x: 540, y: 260, attrs: { color: 'blue' }, domWrapper: mockWrap };
const d3 = { id: 'part_led_3', type: 'wokwi-led', x: 540, y: 310, attrs: { color: 'blue' }, domWrapper: mockWrap };

netlist.addComponent(uno);
netlist.addComponent(r1);
netlist.addComponent(r2);
netlist.addComponent(r3);
netlist.addComponent(d1);
netlist.addComponent(d2);
netlist.addComponent(d3);

console.log(`Total components added: ${netlist.getAllComponents().length}`);
if (netlist.getAllComponents().length !== 7) throw new Error('Expected 7 components');

console.log('--- 2. Testing BOM Generation (Screenshot 081423 Parity) ---');
const bom = CircuitSchematic.getBom(netlist);
console.log('Generated BOM items:', JSON.stringify(bom, null, 2));

const ledItem = bom.find(i => i.component === 'Blue LED');
const rItem = bom.find(i => i.component.includes('200 \u03A9 Resistor'));
const unoItem = bom.find(i => i.component === 'Arduino Uno R3');

if (!ledItem || ledItem.quantity !== 3) throw new Error('BOM LED item incorrect');
if (!rItem || rItem.quantity !== 3) throw new Error('BOM Resistor item incorrect');
if (!unoItem || unoItem.quantity !== 1) throw new Error('BOM Uno item incorrect');

console.log(`✓ BOM Verification Passed! LEDs: ${ledItem.quantity}, Resistors: ${rItem.quantity}, Uno: ${unoItem.quantity}`);

console.log('--- 3. Testing Schematic View SVG Generation (Screenshot 081349 Parity) ---');
// Connect wires
netlist.addWire({ compId: uno.id, pin: '3' }, { compId: r1.id, pin: '1' }, '#38a169', [{ x: 365, y: 115 }]);
netlist.addWire({ compId: uno.id, pin: '2' }, { compId: r2.id, pin: '1' }, '#d69e2e', [{ x: 374.5, y: 150 }]);
netlist.addWire({ compId: uno.id, pin: 'TX' }, { compId: r3.id, pin: '1' }, '#e53e3e', [{ x: 384, y: 185 }]);

netlist.addWire({ compId: r1.id, pin: '2' }, { compId: d1.id, pin: 'A' }, '#38a169');
netlist.addWire({ compId: r2.id, pin: '2' }, { compId: d2.id, pin: 'A' }, '#d69e2e');
netlist.addWire({ compId: r3.id, pin: '2' }, { compId: d3.id, pin: 'A' }, '#e53e3e');

netlist.addWire({ compId: uno.id, pin: 'GND.2' }, { compId: d3.id, pin: 'C' }, '#1a202c');
netlist.addWire({ compId: d3.id, pin: 'C' }, { compId: d2.id, pin: 'C' }, '#1a202c');
netlist.addWire({ compId: d2.id, pin: 'C' }, { compId: d1.id, pin: 'C' }, '#1a202c');

const mockContainer = { innerHTML: '' };
global.document.getElementById = (id) => (id === 'schematicContainer' ? mockContainer : null);

CircuitSchematic.renderSchematic(netlist, 'schematicContainer');
const svg = mockContainer.innerHTML;

if (!svg.includes('Title:  Editing Components')) throw new Error('Schematic missing title block');
if (!svg.includes('Made with IrieBlocky')) throw new Error('Schematic missing watermark');
if (!svg.includes('U1_GND')) throw new Error('Schematic missing U1_GND symbol');
if (!svg.includes('Arduino') || !svg.includes('UNO')) throw new Error('Schematic missing Uno symbol');
if (!svg.includes('R1') || !svg.includes('D1')) throw new Error('Schematic missing peripheral symbols');

console.log(`✓ Schematic SVG Generation Passed! SVG length: ${svg.length} characters`);

console.log('--- 4. Testing CircuitCanvas Pin Positions & Neat Orthogonal Routing ---');
const boardMock = {
  style: {},
  addEventListener: () => {},
  appendChild: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
};
const svgMock = {
  style: {},
  appendChild: () => {},
  querySelectorAll: () => []
};

global.document.getElementById = (id) => {
  if (id === 'circuitBoard') return boardMock;
  if (id === 'wireSvg') return svgMock;
  if (id === 'schematicContainer') return mockContainer;
  return null;
};

const canvas = new CircuitCanvas('circuitBoard', 'wireSvg');
canvas.netlist = netlist;

// Test Uno pin 3 calculation (headerOffset should be 0, not 18!)
const pin3Pos = canvas.getPinAbsolutePosition(uno.id, '3');
console.log('Pin 3 absolute pos:', pin3Pos);
// x: comp.x (140) + pin.x (225) = 365
// y: comp.y (220) + pin.y (9) + headerOffset(0) = 229
if (pin3Pos.x !== 365 || pin3Pos.y !== 229) {
  throw new Error(`Expected pin 3 at (365, 229), got (${pin3Pos.x}, ${pin3Pos.y})`);
}
console.log('✓ headerOffset = 0 verified! Pins snap to 100% exact SVG terminal positions.');

// Test Manhattan Orthogonal Routing
const p1 = { x: 365, y: 229 }; // Uno pin 3
const p2 = { x: 430, y: 115 }; // R1 lead 1
const pathOrthogonal = canvas.calculateWirePath(p1, p2, []);
console.log('Generated Orthogonal Wire Path:\n ', pathOrthogonal);

if (!pathOrthogonal.startsWith('M 365 229')) throw new Error('Invalid path start');
if (!pathOrthogonal.includes('Q')) throw new Error('Expected rounded 90-degree corner arc (Q command)');
if (!pathOrthogonal.endsWith('430 115')) throw new Error('Invalid path end');

console.log('✓ Neat Orthogonal Manhattan routing with rounded corners verified!');

console.log('\n========================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('========================================');
