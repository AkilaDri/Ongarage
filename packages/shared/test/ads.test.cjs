// Garages may buy ad space only with a good rating and enough reviews (marketplace/ads.ts).
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const ads = load('marketplace/ads');

test('a garage with a good rating and enough reviews may buy ad space', () => {
  assert.equal(ads.adEligible({ rating: 4.7, reviews: 18 }), true);
  assert.equal(ads.adEligible({ rating: 4.0, reviews: 10 }), true);
});

test('a low rating or too few reviews keeps a garage out of ads', () => {
  assert.equal(ads.adEligible({ rating: 3.9, reviews: 200 }), false);
  assert.equal(ads.adEligible({ rating: 5.0, reviews: 9 }), false);
});
