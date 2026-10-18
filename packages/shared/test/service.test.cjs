// Routine servicing (marketplace/service.ts): the service category, the kinds and fluids, and the reminder before the next service.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const svc = load('marketplace/service');
const cats = load('constants/categories');
const DAY = 24 * 60 * 60 * 1000;

test('there is a Service category with the sub-services an owner picks', () => {
  const c = cats.categoryInfo(svc.SERVICE_CATEGORY_ID);
  assert.equal(c.name, 'Service');
  assert.deepEqual(c.subcategories, svc.SERVICE_SUBCATEGORIES);
  assert.ok(svc.isServiceCategory(svc.SERVICE_CATEGORY_ID));
  assert.ok(!svc.isServiceCategory('7'));
});

test('a full service changes every fluid, an oil change only the engine oil', () => {
  assert.equal(svc.defaultFluids('full').length, svc.SERVICE_FLUIDS.length);
  assert.deepEqual(svc.defaultFluids('oil'), ['engineOil']);
  assert.deepEqual(svc.defaultFluids('fluids'), []);
  assert.equal(svc.kindFromSub('Full Service'), 'full');
  assert.equal(svc.kindFromSub('Oil Change'), 'oil');
  assert.equal(svc.kindFromSub('Brake Fluid'), 'fluids');
  assert.equal(svc.fluidFromSub('Brake Fluid'), 'brakeFluid');
});

test('the next service starts from the mileage and the date of this one', () => {
  const d = svc.nextServiceDefaults('oil', 80000, 0);
  assert.equal(d.nextServiceKm, 85000);
  assert.equal(d.nextServiceAt, 90 * DAY);
  assert.equal(svc.nextServiceDefaults('full', 80000, 0).nextServiceKm, 90000);
});

test('the reminder turns soon, due and overdue by days or by mileage', () => {
  const now = 100 * DAY;
  assert.equal(svc.serviceReminder({ nextServiceAt: now + 60 * DAY }, now).state, 'ok');
  assert.equal(svc.serviceReminder({ nextServiceAt: now + 10 * DAY }, now).state, 'soon');
  assert.equal(svc.serviceReminder({ nextServiceAt: now }, now).state, 'due');
  assert.equal(svc.serviceReminder({ nextServiceAt: now - 2 * DAY }, now).state, 'overdue');
  assert.equal(svc.serviceReminder({ nextServiceKm: 85000 }, now, 84800).state, 'soon');
  assert.equal(svc.serviceReminder({ nextServiceKm: 85000 }, now, 85200).state, 'overdue');
});
