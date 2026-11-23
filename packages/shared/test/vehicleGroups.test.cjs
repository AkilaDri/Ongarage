// The vehicle groups (cars, motorbikes and three-wheelers, heavy vehicles) and the service categories each one is worked on for (constants/vehicles.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const v = load('constants/vehicles');
const cats = load('constants/categories');

test('every vehicle type belongs to one group', () => {
  assert.equal(v.vehicleGroup('Sedan'), 'car');
  assert.equal(v.vehicleGroup('Pickup'), 'car');
  assert.equal(v.vehicleGroup('Motorbike'), 'twoThree');
  assert.equal(v.vehicleGroup('Three-wheeler'), 'twoThree');
  assert.equal(v.vehicleGroup('Bus'), 'heavy');
  assert.equal(v.vehicleGroup('Lorry'), 'heavy');
});

test('a motorbike or three-wheeler gets the two-wheeler categories, not the car ones', () => {
  const ids = v.categoriesForVehicle('Motorbike');
  assert.equal(ids.length, 14);
  assert.ok(ids.every((id) => id.startsWith('b')));
  assert.ok(v.categoriesForVehicle('Three-wheeler').every((id) => id.startsWith('t')) && v.categoriesForVehicle('Three-wheeler').length === 15);
  assert.ok(!v.categoriesForVehicle('Motorbike').includes('4'));
});

test('a car keeps the full car list, and every listed category exists', () => {
  assert.ok(v.categoriesForVehicle('Sedan').includes('1'));
  assert.ok(v.categoriesForVehicle('Sedan').includes('16'));
  for (const type of ['Sedan', 'Motorbike', 'Bus']) {
    for (const id of v.categoriesForVehicle(type)) assert.ok(cats.SERVICE_CATEGORIES.some((c) => c.id === id), `${type} -> ${id}`);
  }
});

test('the two-wheeler categories carry their sub-services', () => {
  for (const id of v.categoriesForVehicle('Motorbike')) {
    const c = cats.SERVICE_CATEGORIES.find((x) => x.id === id);
    assert.ok(c.subcategories.length > 0, id);
  }
});
