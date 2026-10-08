const { spec } = require('../lib.cjs');

// OnMart Shop: a customer's enquiry that a garage (TOPCODE) sent them to — answer it, the buyer reserves, the shop
// packs it, checks the buyer's purchase code at the counter (a price above the listed one is refused for a referred
// buyer), and the garage's referral shows in the report. Also the open wall.
module.exports = spec('Parts shop · customer enquiry, purchase code and referral', 'parts', async (t) => {
  await t.clickText('ගනුදෙනුකරු');
  t.check('the customer enquiry shows, with the garage that recommended the shop', (await t.has('නිමල් පෙරේරා')) && (await t.has('Brake disc')) && (await t.has('TOPCODE Tuning & Service නිර්දේශ කළා')));

  // The open wall: nationwide posts for parts this shop sells (the poster stays anonymous)
  await t.clickText('විවෘත');
  t.check('wall posts for parts the shop sells', (await t.has('Alternator')) && (await t.has('Radiator')) && (await t.has('විවෘත දුර්ලභ කොටස් පෝස්ට් එක')));
  await t.clickText('ගනුදෙනුකරු');

  // Answer the enquiry (Brake disc is in stock): the referral note, then send
  await t.clickInCard('නිමල් පෙරේරා', 'පිළිතුරු දෙන්න');
  t.check('the answer sheet explains the referral', (await t.has('ඔබව නිර්දේශ කළා')) && (await t.has('ලැයිස්තුගත මිලට වඩා වැඩි නොවිය යුතුයි')));
  await t.clickText('පිළිතුර යවන්න ·');
  await t.wait(16500);
  t.check('the buyer reserved it', await t.has('වෙන් කළා'));

  // Orders → Customers: pack, the buyer arrives, check the purchase code and the paid amount
  await t.clickText('Orders');
  await t.clickText('ගනුදෙනුකරුවන්');
  t.check('the sale is listed for the referred customer', (await t.has('නිමල් පෙරේරා')) && (await t.has('TOPCODE Tuning & Service නිර්දේශ කළා')));
  await t.clickText('ඇසුරුම් කළා · කවුන්ටරයේ සූදානම්');
  await t.wait(9000);
  t.check('the buyer reached the counter', await t.has('ගනුදෙනුකරු කවුන්ටරයට පැමිණියා'));
  await t.clickText('කේතය පරීක්ෂා කර මුදල් ලබා ගන්න');
  const code = await t.page.evaluate(() => document.body.innerText.match(/නිවැරදි කේතය ([0-9]{6})/)?.[1]);
  await t.type('Purchase code', '111111');
  await t.clickText('තහවුරු කර මුදල් ලබා ගන්න');
  t.check('a wrong purchase code is rejected', await t.has('කේතය නොගැළපේ'));
  await t.type('Purchase code', code);
  const listed = await t.page.evaluate(() => Number(document.body.innerText.match(/ලැයිස්තුගත මුළු මිල රු\. ([0-9,]+)/)?.[1].replace(/,/g, '')));
  await t.type('Amount paid', String(listed + 500));
  await t.clickText('තහවුරු කර මුදල් ලබා ගන්න');
  t.check('a referred buyer cannot be charged above the listed price', await t.has('ලැයිස්තුගත මිලට'));
  await t.type('Amount paid', String(listed));
  await t.clickText('තහවුරු කර මුදල් ලබා ගන්න');
  t.check('sale confirmed and paid', await t.has('ලැබුණා රු.'));

  // The referral moves on: fitted, then the job closes and the commission is earned
  await t.wait(15000);
  await t.clickText('Shop');
  await t.clickLabel('Open referrals');
  t.check('the referral report names the garage and its commission', (await t.has('TOPCODE Tuning & Service')) && (await t.has('ගෙවීමට ඉතිරි කොමිස්')));
  await t.clickText('ගෙවූ බව සටහන් කරන්න');
  t.check('a month can be marked paid', await t.has('✓ කොමිස් ගෙවූවා'));
  await t.shot('parts-customer-sale');
});
