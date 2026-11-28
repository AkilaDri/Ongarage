const { spec } = require('../lib.cjs');

// Owner Home: the SOS and quotes card, search, the services grid and offer banner, then the garage rows (past garages first, the offers after them,
// the nearby row, and the labelled featured row last). See docs/marketplace.md ("Owner app rows").
module.exports = spec('Owner · Home SOS, garages, all services, ads, offers', 'user', async (t) => {
  const p = t.page;
  await t.clickLabel('See all services');
  const categories = await t.labels('Service ');
  t.check('all services lists every category', categories.length >= 12, categories.length);
  await t.escape();

  t.check('offer tiles', (await t.labels('Offer ')).length === 4);
  t.check('the featured row is labelled as ads', await t.has('විශේෂාංග · දැන්වීම්'));
  t.check('past garages, then offers, nearby, and the paid row last', await p.evaluate(() => {
    const at = (label) => document.querySelector(`[aria-label="${label}"]`)?.getBoundingClientRect().top ?? NaN;
    const used = at('See all ඔබ පෙර භාවිතා කළ ගරාජ');
    const offer = at('Offer අලුත් ගරාජ');
    const near = at('See all ඔබට ළඟම');
    const paid = at('See all විශේෂාංග · දැන්වීම්');
    return used < offer && offer < near && near < paid;
  }));

  // An offer opens the garages it covers
  await t.clickLabel('Offer අලුත් ගරාජ');
  t.check('"new garages" offer lists newly joined garages', (await t.has('අලුතින් එක් වූ ගරාජ')) && (await t.has('Unawatuna Car Clinic')));
  await t.escape();

  // "See all" on a row, and a category from the all services list
  await t.clickLabel('See all ඔබට ළඟම');
  t.check('see-all lists the garages of the row', (await t.labels('Garage ')).length >= 9);
  await t.escape();
  await t.clickLabel('See all services');
  await p.evaluate(() => document.querySelector('[aria-label="Service Batteries"]').scrollIntoView({ block: 'center' }));
  await t.clickLabel('Service Batteries');
  t.check('a category opens its services', await t.has('Battery Replacement'));
  await t.shot('owner-home');

  // The two photo banners at the top still open their flows (fresh page for each).
  const fresh = async () => {
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.body.innerText.includes('Akila Drishan'), { timeout: 120000 });
    await t.wait(1200);
  };
  await fresh();
  await t.clickText('Ongarage උදව් ඉල්ලන්න');
  t.check('SOS card opens the breakdown location picker', await t.has('බ්‍රේක්ඩවුන් ස්ථානය තෝරන්න'));
  await fresh();
  await t.clickText('Ongarage Quotes ඉල්ලන්න');
  await t.wait(1200);
  t.check('the quotes card opens the quote request', await t.has('සේවා අංශය'));
});
