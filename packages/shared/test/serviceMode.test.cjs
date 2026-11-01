const test = require('node:test');
const assert = require('node:assert/strict');
const { serviceModeOf, canBid, canBook, usesGarages } = require('../.test-build/constants/categories.js');

test('repair categories are jobs: bid, book and garages', () => {
  for (const id of ['1', '6', '7', '14']) {
    assert.equal(serviceModeOf(id), 'job');
    assert.equal(canBid(id), true);
    assert.equal(canBook(id), true);
    assert.equal(usesGarages(id), true);
  }
});

test('a fuel station is a place: no bids, no booking, no garages', () => {
  assert.equal(serviceModeOf('16'), 'place');
  assert.equal(serviceModeOf('16', 'Petrol'), 'place');
  assert.equal(canBid('16'), false);
  assert.equal(canBook('16'), false);
  assert.equal(usesGarages('16'), false);
});

test('an EV charging port is a place that can be booked', () => {
  assert.equal(serviceModeOf('13', 'DC Fast Charging'), 'place');
  assert.equal(canBid('13', 'AC Charging Port'), false);
  assert.equal(canBook('13', 'AC Charging Port'), true);
  assert.equal(usesGarages('13', 'AC Charging Port'), false);
});

test('EV charging splits by sub-service: install is a job, mobile charging a dispatch', () => {
  assert.equal(serviceModeOf('13', 'Home Charger Install'), 'job');
  assert.equal(canBid('13', 'Home Charger Install'), true);
  assert.equal(serviceModeOf('13', 'Mobile EV Charging'), 'dispatch');
  assert.equal(canBid('13', 'Mobile EV Charging'), false);
});

test('towing is a dispatch: booked, never bid for', () => {
  assert.equal(serviceModeOf('12'), 'dispatch');
  assert.equal(canBid('12'), false);
  assert.equal(canBook('12'), true);
  assert.equal(usesGarages('12'), true);
});

test('an unknown category defaults to a job', () => {
  assert.equal(serviceModeOf('999'), 'job');
});

test('the bid form only offers what can be bid for', () => {
  const { bidSubServices, garageSubServices } = require('../.test-build/constants/categories.js');
  assert.deepEqual(bidSubServices('16'), []);
  assert.deepEqual(bidSubServices('12'), []);
  assert.deepEqual(bidSubServices('13'), ['Home Charger Install']);
  assert.ok(bidSubServices('6').includes('Wheel Alignment'));
  assert.deepEqual(garageSubServices('16'), []);
  assert.deepEqual(garageSubServices('13'), ['Home Charger Install', 'Mobile EV Charging']);
  assert.ok(garageSubServices('12').includes('Flatbed Towing'));
});
