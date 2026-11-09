// What owners search for and what they tap (marketplace/searchLog.ts): the log, the summary and the words the search learns.
const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');

const log = load('marketplace/searchLog');
const ss = load('marketplace/serviceSearch');
const brake = { categoryId: '7', sub: 'Brake Pads', label: 'Brake Pads' };
const ev = (query, hits, picked) => ({ query, hits, picked, at: 0 });

test('blank searches are not kept, and the log keeps only the newest searches', () => {
  assert.equal(log.recordSearch([], ev('   ', 0)).length, 0);
  let events = [];
  for (let i = 0; i < log.SEARCH_LOG_LIMIT + 5; i++) events = log.recordSearch(events, ev(`oil ${i}`, 3));
  assert.equal(events.length, log.SEARCH_LOG_LIMIT);
});

test('the summary counts empty searches, the words the search does not know and the picks', () => {
  const events = [ev('kalu pad', 0), ev('kalu pad', 0), ev('brake pad', 2, brake), ev('brake pad', 2, brake)];
  const s = log.summariseSearches(events);
  assert.equal(s.total, 4);
  assert.deepEqual(s.emptyQueries[0], { query: 'kalu pad', count: 2 });
  assert.ok(s.unknownWords.some((w) => w.word === 'kalu'));
  assert.equal(s.picks[0].label, 'Brake Pads');
  assert.equal(s.picks[0].count, 2);
});

test('a phrase that repeats before a sub-service pick is learned, a single one is not', () => {
  const once = [ev('kalu pad', 0, brake)];
  assert.deepEqual(log.learnedFrom(once), []);
  const twice = [...once, ev('kalu pad', 0, brake)];
  assert.deepEqual(log.learnedFrom(twice), [{ categoryId: '7', sub: 'Brake Pads', words: ['kalu', 'pad'] }]);
});

test('learned words make the search find the service', () => {
  assert.equal(ss.searchServices('kalu')[0]?.sub, undefined);
  ss.setLearnedTerms([{ categoryId: '7', sub: 'Brake Pads', words: ['kalu', 'pad'] }]);
  assert.equal(ss.searchServices('kalu')[0].sub, 'Brake Pads');
  ss.setLearnedTerms([]);
  assert.deepEqual(ss.searchServices('kalu'), []);
});
