const { spec } = require('../lib.cjs');

// Technician: a parts pickup task, a workshop job with extra work (handover waits),
// closing with the owner's code, and the level card.
module.exports = spec('Technician · pickup task, workshop job, level', 'tech', async (t) => {
  await t.clickLabel('Collect parts Galle Auto Parts');
  t.check('pickup code shown', (await t.labels('Close code ')).length === 1);
  await t.clickText('වෙළඳසැල කේතය පරීක්ෂා කළා');
  await t.clickText('TOPCODE Tuning & Service වෙත භාර දුන්නා');
  t.check('pickup task done', !(await t.has('කොටස් එකතු කිරීම')));

  await t.clickText('TOPCODE');
  await t.wait(1500);
  await t.clickLabel('ECU Remapping job card');
  await t.clickText('වාහනය ලැබුණා');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('ලැබුණු බව තහවුරු කර');
  await t.clickText('පරීක්ෂා වාර්තාව ලියන්න');
  await t.type('Diagnosis findings', 'Air filter dirty, needs cleaning only');
  await t.type('New labour name', 'Throttle body clean');
  await t.type('New labour price', '1500');
  await t.clickText('+ වැඩ');
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  await t.wait(5000);
  t.check('approved → repairing', await t.has('අලුත්වැඩියා කරමින්'));
  await t.clickText('අමතර වැඩක්');
  await t.type('Diagnosis findings', 'Spark plugs worn found during repair');
  await t.clickLabel('Suggest parts from note');
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  await t.clickText('භාරදීමට සූදානම්');
  t.check('handover waits for the extra-work answer', await t.has('අමතර වැඩ ගැන තීරණය කරන තුරු'));
  await t.escape();
  await t.wait(14000);
  t.check('extra approved, its parts arrived', await t.has('කොටස් ගරාජයට ලැබී ඇත'));

  await t.clickText('භාරදීමට සූදානම්');
  const checks = (await t.labels('Handover check')).length;
  for (let i = 1; i <= checks; i++) await t.clickLabel(`Handover check ${i}`);
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('භාරදීමට සූදානම් ලෙස දන්වන්න');
  await t.clickText('අයිතිකරුගේ කේතයෙන් අවසන් කරන්න');
  const code = await t.page.evaluate(() => document.body.innerText.match(/නිවැරදි කේතය ([0-9]{6})/)?.[1]);
  await t.type('Owner close code', code);
  await t.clickLabel('Confirm owner code');
  t.check('closed with the owner\'s code and paid', await t.has('කේතයෙන් තහවුරු කළා'));
  await t.escape();

  await t.clickText('Profile');
  t.check('level card', (await t.labels('Technician level')).length === 1 && (await t.has('ඊළඟ:')));
  await t.shot('tech');
});
