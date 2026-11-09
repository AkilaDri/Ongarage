const { spec } = require('../lib.cjs');

// Owner Home: the SOS card at the top, the vehicle card and search, then garage rows (past garages first), then the
// "All services" link, ad banners, offer tiles and the labelled featured row. Ads are labelled; tiles open the garage with Call / Book.
module.exports = spec('Owner · Home SOS, garages, all services, ads, offers', 'user', async (t) => {
  const p = t.page;
  await t.clickLabel('All services');
  const categories = await t.labels('Service ');
  t.check('all services lists every category', categories.length >= 12, categories.length);
  await t.escape();

  t.check('ad banners are labelled', (await t.labels('Promo ')).length === 3 && (await t.has('දැන්වීම')));
  t.check('offer tiles', (await t.labels('Offer ')).length === 4);
  // Newly joined is left out when every new garage already has a place in an earlier row (each garage appears once).
  for (const row of ['විශේෂාංග · දැන්වීම්', 'ජනප්‍රිය ගරාජ', 'ඔබට ළඟම']) t.check(`row: ${row}`, await t.has(row));
  t.check('garage rows come before the ads and offers', (await p.evaluate(() => {
    const top = (txt) => { const el = [...document.querySelectorAll('*')].find((e) => e.childNodes.length === 1 && e.textContent === txt); return el ? el.getBoundingClientRect().top : Infinity; };
    return top('ජනප්‍රිය ගරාජ') < top('ගනුදෙනු සහ දීමනා');
  })));

  // A banner opens its garage, with Call and Book
  await t.clickLabel('Promo හයිබ්‍රිඩ් / EV සේවාව');
  t.check('banner opens its garage', (await t.has('Galle Hybrid Care')) && (await t.has('වෙන් කරන්න')));
  await t.clickText('වෙන් කරන්න');
  t.check('book from the garage opens the booking form', await t.has('Galle Hybrid Care'));
  await t.escape();

  // An offer opens the garages it covers
  await t.clickLabel('Offer අලුත් ගරාජ');
  t.check('"new garages" offer lists newly joined garages', (await t.has('අලුතින් එක් වූ ගරාජ')) && (await t.has('Unawatuna Car Clinic')));
  await t.escape();

  // "See all" on a row, and a category from the all services list
  await t.clickLabel('See all ජනප්‍රිය ගරාජ');
  t.check('see-all lists every garage in the row', (await t.labels('Garage ')).length >= 9);
  await t.escape();
  await t.clickLabel('All services');
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
  await t.clickLabel('Open SOS');
  t.check('SOS card opens the breakdown location picker', await t.has('Breakdown ස්ථානය තෝරන්න'));
  await fresh();
  await t.clickLabel('Post a repair job');
  // The seeded owner has a balance 32 days late, so new work is limited and Quotes asks for the balance first.
  t.check('Quotes asks for the overdue balance first', await t.has('පළමුව ඉතිරි හිඟ මුදල ගෙවන්න'));
});
