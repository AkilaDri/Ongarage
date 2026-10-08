const { spec } = require('../lib.cjs');

// OnMart Shop: put a deal on a stock item (with the live price preview), see it on the item, then free delivery and an
// ad banner request that is reviewed and goes live. Ads are labelled and never change the shop's ranking.
module.exports = spec('Parts shop · OnMart deals, free delivery and ad banner', 'parts', async (t) => {
  await t.clickText('Stock');
  t.check('the seeded deals show on their stock items', (await t.has('−15% දීමනාව ක්‍රියාත්මකයි')) && (await t.has('−10% දීමනාව ක්‍රියාත්මකයි')));

  // A new deal on the front brake pads (Genuine): preview, set, shown on the item
  await t.clickLabel('Deal Brake pads (front) Genuine');
  t.check('the deal sheet previews the new price', (await t.has('දීමනා මිල')) && (await t.has('සාමාන්‍ය මිල')));
  await t.clickLabel('Discount 20');
  await t.clickLabel('Days 7');
  await t.clickText('දීමනාව සක්‍රීය කරන්න');
  t.check('the deal is on the item', await t.has('−20% දීමනාව ක්‍රියාත්මකයි'));

  // The Shop tab: free delivery and an ad banner
  await t.clickText('Shop');
  await t.clickLabel('Open promotions');
  t.check('the promotions sheet lists the running deals', (await t.has('දීමනා (3)')) || (await t.has('දීමනා (4)')));
  await t.clickLabel('Free delivery 5000');
  await t.type('Banner title', 'බ්‍රේක් සතිය විශේෂ');
  await t.type('Banner subtitle', 'පෑඩ්, ඩිස්ක් · −20% දක්වා');
  await t.clickText('දැන්වීම ඉල්ලන්න');
  t.check('the banner is reviewed first', await t.has('OnGarage සමාලෝචනය කරමින්'));
  await t.wait(7500);
  t.check('then it goes live as an ad', await t.has('● සක්‍රීයයි'));
  t.check('the sheet says ads never change the ranking', await t.has('ශ්‍රේණිගත කිරීමට හෝ ලැයිස්තු අනුපිළිවෙලට බලපාන්නේ නැත'));
  await t.shot('parts-promotions');
});
