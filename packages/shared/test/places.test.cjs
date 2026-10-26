const test = require('node:test');
const assert = require('node:assert/strict');
const { filterPlaces, filterDefaultsFor, freePlugs, nearestFirst, FAST_KW } = require('../.test-build/marketplace/places.js');

const fuel = (id, over = {}) => ({ id, kind: 'fuel', name: id, brand: 'X', coords: { latitude: 0, longitude: 0 }, address: '', phone: '', open24: false, open: true, services: ['Petrol'], amenities: [], fuels: [{ name: 'Petrol 92', price: 300, stock: 'available' }], ...over });
const ev = (id, over = {}) => ({ id, kind: 'ev', name: id, brand: 'X', coords: { latitude: 0, longitude: 0 }, address: '', phone: '', open24: false, open: true, services: ['AC Charging Port'], amenities: [], connectors: [{ type: 'Type 2', kw: 22, price: 70, states: ['free', 'busy'] }], ...over });

test('fuel type: only stations that sell it and still have some', () => {
  const list = [fuel('a'), fuel('b', { fuels: [{ name: 'Petrol 92', price: 300, stock: 'out' }, { name: 'Auto Diesel', price: 280, stock: 'low' }] }), fuel('c', { fuels: [{ name: 'Petrol 95', price: 350, stock: 'available' }] })];
  assert.deepEqual(filterPlaces(list, { fuel: 'Petrol 92' }).map((p) => p.id), ['a']);
  assert.deepEqual(filterPlaces(list, { fuel: 'Auto Diesel' }).map((p) => p.id), ['b']);
  assert.deepEqual(filterPlaces(list, { fuel: 'Petrol 95' }).map((p) => p.id), ['c']);
});

test('plug type and speed for chargers', () => {
  const list = [ev('slow'), ev('fast', { connectors: [{ type: 'CCS2', kw: 120, price: 130, states: ['free'] }] }), ev('mixed', { connectors: [{ type: 'CHAdeMO', kw: FAST_KW, price: 120, states: ['busy'] }, { type: 'Type 2', kw: 11, price: 60, states: ['offline'] }] })];
  assert.deepEqual(filterPlaces(list, { plug: 'CCS2' }).map((p) => p.id), ['fast']);
  assert.deepEqual(filterPlaces(list, { speed: 'fast' }).map((p) => p.id), ['fast', 'mixed']);
  assert.deepEqual(filterPlaces(list, { speed: 'slow' }).map((p) => p.id), ['slow', 'mixed']);
  assert.deepEqual(filterPlaces(list, { freeNow: true }).map((p) => p.id), ['slow', 'fast']);
});

test('24/7, open now and amenities (every one asked for must be there)', () => {
  const list = [fuel('a', { open24: true, amenities: ['Car Wash', 'ATM'] }), fuel('b', { open: false, amenities: ['Car Wash'] }), fuel('c', { amenities: ['Car Wash', 'ATM', 'Mini Mart'] })];
  assert.deepEqual(filterPlaces(list, { open24: true }).map((p) => p.id), ['a']);
  assert.deepEqual(filterPlaces(list, { open: true }).map((p) => p.id), ['a', 'c']);
  assert.deepEqual(filterPlaces(list, { amenities: ['Car Wash', 'ATM'] }).map((p) => p.id), ['a', 'c']);
  assert.deepEqual(filterPlaces(list, { amenities: ['Mini Mart'] }).map((p) => p.id), ['c']);
  assert.equal(filterPlaces(list, {}).length, 3);
});

test('free plugs are counted per connector', () => {
  assert.equal(freePlugs({ type: 'CCS2', kw: 60, price: 1, states: ['free', 'busy', 'free', 'offline'] }), 2);
});

test('the vehicle suggests the filters: its fuel, or an electric one its plug', () => {
  assert.deepEqual(filterDefaultsFor({ fuelType: 'Diesel' }, 'fuel'), { fuel: 'Auto Diesel' });
  assert.deepEqual(filterDefaultsFor({ fuelType: 'Petrol' }, 'fuel'), { fuel: 'Petrol 92' });
  assert.deepEqual(filterDefaultsFor({ fuelType: 'Hybrid' }, 'fuel'), { fuel: 'Petrol 92' });
  assert.deepEqual(filterDefaultsFor({ fuelType: 'Electric', connectorType: 'CCS2' }, 'ev'), { plug: 'CCS2' });
  assert.deepEqual(filterDefaultsFor({ fuelType: 'Petrol' }, 'ev'), {});
  assert.deepEqual(filterDefaultsFor(undefined, 'fuel'), {});
});

test('nearest first', () => {
  assert.deepEqual(nearestFirst([{ distance: 3 }, { distance: 1 }, { distance: 2 }]).map((x) => x.distance), [1, 2, 3]);
});
