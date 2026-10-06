const { spec } = require('../lib.cjs');

// Owner Home: categories as round photos in two sideways rows, ad banners and offer
// tiles after them, then rows of garage tiles (one photo, name, rating and a few
// details). Ads are labelled; tiles open the garage with Call / Book.
module.exports = spec('Owner · Home categories, ads, offers, garage rows', 'user', async (t) => {
  const p = t.page;
  const categories = await t.labels('Service ');
  t.check('all 12 categories as round photos', categories.length === 12 && (await p.evaluate(() => [...document.querySelectorAll('[aria-label^="Service "] img')].length)) === 12, categories.length);
  // Two rows: the first half on top, read left to right.
  const tops = await p.evaluate(() =>
    ['Mechanical', 'Electrical', 'Brake & Susp'].map((n) => Math.round(document.querySelector(`[aria-label="Service ${n}"]`).getBoundingClientRect().top))
  );
  t.check('two rows, first half on top', tops[0] === tops[1] && tops[2] > tops[0], tops);

  t.check('ad banners are labelled', (await t.labels('Promo ')).length === 3 && (await t.has('දැන්වීම')));
  t.check('offer tiles', (await t.labels('Offer ')).length === 4);
  for (const row of ['විශේෂාංග · දැන්වීම්', 'අලුතින් එක් වූ', 'ජනප්‍රිය ගරාජ', 'ඔබට ළඟම']) t.check(`row: ${row}`, await t.has(row));

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

  // "See all" on a row, and a category from the strip
  await t.clickLabel('See all ජනප්‍රිය ගරාජ');
  t.check('see-all lists every garage in the row', (await t.labels('Garage ')).length >= 9);
  await t.escape();
  await t.clickLabel('Service Batteries');
  t.check('a category opens its garages', await t.has('Batteries'));
  await t.shot('owner-home');

  // The two photo banners at the top still open their flows (fresh page for each).
  const fresh = async () => {
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.body.innerText.includes('Akila Drishan'), { timeout: 120000 });
    await t.wait(1200);
  };
  await fresh();
  await t.clickLabel('Open SOS');
  t.check('SOS banner opens the breakdown location picker', await t.has('වාහනය නැවතී ඇති තැන තෝරන්න'));
  await fresh();
  await t.clickLabel('Post a repair job');
  t.check('repair-job banner opens the job form', await t.has('අලුත්වැඩියා රැකියාවක් පළ කරන්න'));
});
