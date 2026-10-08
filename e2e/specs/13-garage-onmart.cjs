const { spec } = require('../lib.cjs');

// Garage: a part the garage can't fetch — mark it "customer buys it", recommend shops, handover waits, the customer
// buys (simulated) and the garage checks the part; then the referral report and the OnMart tab.
module.exports = spec('Garage · customer buys a part, referrals', 'garage', async (t) => {
  await t.clickText('Schedule');
  await t.clickText('වාහනය ලැබුණා');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('ලැබුණු බව තහවුරු කර');
  await t.clickText('පරීක්ෂා වාර්තාව ලියන්න');
  await t.type('Diagnosis findings', 'Front brake discs scored badly and need replacing');
  await t.clickLabel('Suggest parts from note');
  t.check('the note suggests the brake disc', (await t.labels('Price ')).length >= 1);

  // Customer buys it: shops are recommended, with the referral fee visible to the garage
  await t.clickText('පාරිභෝගිකයා මිලදී ගනී');
  t.check('shops that have the part can be recommended, with their commission', (await t.labels('Recommend ')).length >= 2 && (await t.has('කොමිස් 3%')));
  t.check('owner-bought parts are shown apart from the garage bill', await t.has('ගනුදෙනුකරු වෙළඳසැලට ගෙවන කොටස්'));
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  await t.wait(6000);

  // Waiting for the customer's purchase blocks handover
  t.check('the card tracks the customer-bought part', await t.has('පාරිභෝගිකයා මිලදී ගත යුතු කොටස්'));
  await t.clickText('භාරදීමට සූදානම්');
  t.check('handover waits for the customer to buy it', await t.has('OnMart හි මිලදී ගත යුතු කොටස්'));
  await t.escape();

  // The customer buys at a recommended shop (simulated); the garage checks the part
  await t.wait(15000);
  t.check('the garage is told the customer bought it', await t.has('පරීක්ෂා කරන්න'));
  await t.clickLabel('Customer-bought parts');
  t.check('the sheet names the shop and the amount', (await t.has('වෙතින් මිලදී ගත්තා')) && (await t.has('නිර්දේශිත:')));
  await t.clickText('කොටස පරීක්ෂා කළා (අංකය, තත්ත්වය)');
  t.check('part checked, ready to fit', await t.has('කොටස පරීක්ෂා කළා — සවි කිරීමට සූදානම්'));
  await t.escape();
  await t.clickText('භාරදීමට සූදානම්');
  t.check('handover is no longer blocked by the customer part', !(await t.has('OnMart හි මිලදී ගත යුතු කොටස්')));
  await t.escape();

  // The OnMart tab: the marketplace and the referral report
  await t.clickText('OnMart');
  t.check('the OnMart tab lists shops with agreed prices', (await t.has('Galle Auto Parts')) && (await t.has('ගිවිසුම් මිල −5%')));
  await t.clickLabel('OnMart referrals');
  t.check('the referral report shows the shop, the commission owed and a returned part', (await t.has('Galle Auto Parts')) && (await t.has('ඔබට ලැබිය යුතු කොමිස්')) && (await t.has('ආපසු')));
  await t.clickText('ලැබුණු බව සටහන් කරන්න');
  t.check('a shop\'s month can be marked received', await t.has('✓ කොමිස් ලැබුණා'));
  await t.shot('garage-onmart-referrals');
});
