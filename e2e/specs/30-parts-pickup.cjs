const { spec } = require('../lib.cjs');

// Parts shop: quote with counter pickup, won by TOPCODE, ready at the counter, the
// collector's pickup code checked before handing over.
module.exports = spec('Parts shop · counter pickup', 'parts', async (t) => {
  await t.clickInCard('TOPCODE Tuning & Service', 'මිල ගණන් යවන්න');
  t.check('counter pickup offered by default', await t.has('✓ 🏪 කවුන්ටරයෙන් එකතු කිරීමටත් ඉඩ දෙන්න'));
  await t.clickText('මිල ගණන යවන්න ·');
  await t.wait(16500);
  t.check('won; the garage will collect', await t.has('කවුන්ටරයෙන් එකතු කරයි'));
  await t.clickText('ඇණවුම්');
  await t.clickText('තොගයේ ඇත');
  await t.clickText('ඇසුරුම් කළා · කවුන්ටරයේ සූදානම්');
  await t.wait(9000);
  t.check('collector arrived', await t.has('කවුන්ටරයට පැමිණියා'));
  await t.clickText('පිකප් කේතය පරීක්ෂා කර භාර දෙන්න');
  const code = await t.page.evaluate(() => document.body.innerText.match(/නිවැරදි කේතය ([0-9]{6})/)?.[1]);
  await t.type('Owner close code', '111111');
  await t.clickLabel('Confirm owner code');
  t.check('a wrong pickup code is rejected', await t.has('කේතය නොගැළපේ'));
  await t.type('Owner close code', code);
  await t.clickLabel('Confirm owner code');
  t.check('handed over and paid', await t.has('කොටස් භාර දුන්නා'));
  await t.shot('parts-pickup');
});
