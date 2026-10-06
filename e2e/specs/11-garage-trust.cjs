const { spec } = require('../lib.cjs');

// Garage: trust score and level ladder; a reworked job (dispute) puts the level at risk
// with a 30-day grace period.
module.exports = spec('Garage · trust score, levels, grace period', 'garage', async (t) => {
  t.check('level badge in the header', (await t.labels('Level ')).includes('Level trusted'));
  await t.clickText('ගරාජය');
  await t.clickLabel('Open level and trust');
  t.check('weakest-dimension tip', await t.has('වැඩිදියුණු කළ හැකි'));
  t.check('current level marked', await t.has('● ඔබ මෙහි'));
  t.check('locked features stay visible', await t.has('🔒 ආරක්ෂිත රැකියා'));
  await t.escape();

  // Battery job: the owner reports a problem → rework counts as a dispute
  await t.clickText('කාලසටහන');
  await t.clickText('අයිතිකරු වෙත පැමිණියා');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('ලැබුණු බව තහවුරු කර');
  await t.clickText('පරීක්ෂා වාර්තාව ලියන්න');
  await t.type('Diagnosis findings', 'Battery weak, terminals corroded');
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  await t.wait(6000);
  await t.clickText('භාරදීමට සූදානම්');
  const checks = (await t.labels('Handover check')).length;
  for (let i = 1; i <= checks; i++) await t.clickLabel(`Handover check ${i}`);
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('භාරදීමට සූදානම් ලෙස දන්වන්න');
  await t.wait(4500);
  t.check('owner reported a problem', await t.has('ඩෑෂ්බෝඩ් බැටරි ලයිට්'));
  await t.clickText('නැවත පරීක්ෂා කර හදන්න');
  t.check('rework starts', await t.has('නැවත හදමින්'));
  await t.clickText('ගරාජය');
  t.check('level at risk (the rework counts as a dispute)', await t.has('⚠️ මට්ටම අවදානමේ'));
  t.check('grace period shown, level kept', (await t.has('දින 30ක්')) && (await t.labels('Level ')).includes('Level trusted'));
  await t.shot('garage-trust');
});
