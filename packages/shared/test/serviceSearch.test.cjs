// Finding a service from what the owner types (marketplace/serviceSearch.ts): spelling slips, Sinhala, part names and sub-services.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const ss = load('marketplace/serviceSearch');

test('a misspelt part name finds its sub-service in the right category', () => {
  const top = ss.searchServices('break pad')[0];
  assert.equal(top.kind, 'sub');
  assert.equal(top.sub, 'Brake Pads');
  assert.equal(top.categoryId, '7');
});

test('the correct spelling and the plural both find the brake pads', () => {
  assert.equal(ss.searchServices('brake pads')[0].sub, 'Brake Pads');
  assert.equal(ss.searchServices('brake pad')[0].sub, 'Brake Pads');
});

test('Sinhala words for the part find the brake pads', () => {
  assert.equal(ss.searchServices('බ්‍රේක් පෑඩ්')[0].sub, 'Brake Pads');
});

test('a part kind with no sub-service is still found, as a part', () => {
  const hits = ss.searchServices('rotor');
  assert.ok(hits.some((h) => h.kind === 'part' && h.label === 'Brake discs / drums' && h.categoryId === '7'));
});

test('a sub-service name finds itself', () => {
  assert.equal(ss.searchServices('oil change').find((h) => h.sub === 'Oil Change')?.sub, 'Oil Change');
});

test('a query with a word that matches nothing finds nothing', () => {
  assert.deepEqual(ss.searchServices('brake pad xyzzy'), []);
  assert.deepEqual(ss.searchServices('   '), []);
});

test('a sub-service is not listed twice under one category', () => {
  const brake = ss.searchServices('brake pads').filter((h) => h.categoryId === '7' && normalised(h.label) === 'brake pads');
  assert.equal(brake.length, 1);
});

test('did you mean suggests the brake pads for a query with an extra word', () => {
  const hits = ss.didYouMean('brake pad fittingg');
  assert.ok(hits.some((h) => h.sub === 'Brake Pads'));
});

test('did you mean is empty when no word means anything', () => {
  assert.deepEqual(ss.didYouMean('xyzzy qwrt'), []);
});

const normalised = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
