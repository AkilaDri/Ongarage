// The job record that opens a chat (marketplace/jobRecord.ts): its heading and how the vehicle is written.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

// The record builder is plain TypeScript (marketplace/jobRecord.ts), so it loads without React Native.
const { jobRecordText } = load('marketplace/jobRecord');

const aqua = { name: 'Aqua', plate: 'CBD-7712', type: 'Car', make: 'Toyota', model: 'Aqua', color: 'Pearl White', chassisNo: 'NHP1000', engineNo: 'INV-4657' };

test('the record is headed "OnJob Info"', () => {
  assert.equal(jobRecordText({ title: 'Scan ECU' }).split('\n')[0], '📋 OnJob Info');
});

test('the vehicle is two lines: make and model | plate | colour, then chassis | engine', () => {
  const lines = jobRecordText({ title: 'Scan ECU', vehicle: aqua }).split('\n');
  assert.ok(lines.includes('Toyota Aqua | CBD - 7712 | Pearl White'));
  assert.ok(lines.includes('Chassis : NHP1000 | Engine : INV-4657'));
});

test('a registration number is used before the plate, and the hyphen gets spaces', () => {
  const lines = jobRecordText({ title: 't', vehicle: { ...aqua, registrationNo: 'CBD-4585' } }).split('\n');
  assert.ok(lines.includes('Toyota Aqua | CBD - 4585 | Pearl White'));
});

test('what is not known is left out of the vehicle lines', () => {
  const plain = jobRecordText({ title: 't', vehicle: { name: 'Alto K6A', plate: 'KV-4412', type: 'Hatchback' } }).split('\n');
  assert.ok(plain.includes('Alto K6A | KV - 4412'));
  assert.ok(!plain.some((l) => l.startsWith('Chassis') || l.startsWith('Engine')));
  const onlyEngine = jobRecordText({ title: 't', vehicle: { ...aqua, chassisNo: undefined } }).split('\n');
  assert.ok(onlyEngine.includes('Engine : INV-4657'));
});
