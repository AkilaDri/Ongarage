const { spec } = require('../lib.cjs');

// Garage: workshop jobs end to end — parts only for owner-named / approved lines, Recon
// approval, counter pickup by a technician, extra work, handover rules, closing with the
// owner's code.
module.exports = spec('Garage · workshop jobs, parts and pickup', 'garage', async (t) => {
  await t.clickText('Schedule');
  t.check('battery post named a part: orderable before the diagnosis', await t.has('අයිතිකරු සඳහන් කළ කොටස් 1 ක් ඇණවුම් කරන්න'));

  // Battery: pre-order → no Genuine → Recon approval → technician collects from the counter
  await t.clickLabel('Order approved parts');
  t.check('request locked to the named part', (await t.has('අයිතිකරු තම පෝස්ට් එකේ සඳහන් කළ කොටස්')) && (await t.has('Battery 12V 45Ah')));
  await t.clickText('වෙළඳසැල් වෙත යවන්න (1)');
  await t.wait(16000);
  await t.clickText('Genuine නොමැත');
  await t.clickText('Recon සඳහා අයිතිකරුගෙන් අවසර ඉල්ලන්න');
  await t.wait(18000);
  t.check('Recon quotes after approval', await t.has('Southern Spares'));
  await t.clickInCard('Southern Spares', 'කවුන්ටරයෙන් ·');
  await t.clickLabel('Collector m2');
  await t.clickInCard('Southern Spares', 'එකතු කරන්න ·');
  await t.wait(4000);
  t.check('pickup code sent to the technician', await t.has('ඇප් එකට පිකප් කේතය යැව්වා'));
  await t.wait(10500);
  t.check('technician brought the parts', await t.has('ගෙනාවා'));
  await t.clickText('ලැබුණා');
  // The order card offers rating the shop once the parts are checked in (toasts can be replaced).
  t.check('received (order checked in)', await t.has('වෙළඳසැල ශ්‍රේණිගත කරන්න'));
  await t.escape();

  // ECU: receive → diagnosis → approval → order exactly the approved parts → extra work
  await t.clickText('Schedule');
  await t.clickText('වාහනය ලැබුණා');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('ලැබුණු බව තහවුරු කර');
  await t.clickText('පරීක්ෂා වාර්තාව ලියන්න');
  await t.type('Diagnosis findings', 'Front brake pads worn and engine oil leaking');
  await t.clickLabel('Suggest parts from note');
  t.check('AI suggests parts from the note', (await t.labels('Price ')).length >= 2);
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  await t.wait(6000);
  t.check('approved parts to order', await t.has('අනුමත කොටස් 2 ක් ඇණවුම් කරන්න'));
  await t.clickText('භාරදීමට සූදානම්');
  t.check('handover blocked until approved parts are ordered', await t.has('තවම ඇණවුම් කර නැත'));
  await t.escape();

  await t.clickText('අමතර වැඩක්');
  await t.type('Diagnosis findings', 'Rear tyre worn unevenly, needs wheel alignment');
  await t.type('New labour name', 'Wheel alignment');
  await t.type('New labour price', '2500');
  await t.clickText('+ වැඩ');
  await t.clickText('අයිතිකරුගේ අනුමැතියට යවන්න');
  t.check('extra work waits for the owner', await t.has('අමතර වැඩ (රු. 2,500) අයිතිකරුගේ අනුමැතියට'));
  await t.wait(6000);

  await t.clickLabel('Order approved parts');
  t.check('request locked to approved parts', (await t.has('අයිතිකරු අනුමත කළ කොටස් පමණි')) && (await t.has('Engine oil 4L')));
  await t.clickText('වෙළඳසැල් වෙත යවන්න (2)');
  await t.wait(16000);
  await t.clickText('මිල ගණන්');
  await t.clickInCard('Galle Auto Parts', 'ගෙන්වන්න ·');
  await t.wait(16000);
  await t.clickText('ලැබුණා');
  await t.escape();

  // Handover and close with the owner's code
  await t.clickText('Schedule');
  await t.clickText('භාරදීමට සූදානම්');
  t.check('handover allowed once parts arrived; extra labour in the checklist', !(await t.has('තවම ඇණවුම් කර නැත')) && (await t.has('Wheel alignment')));
  const checks = (await t.labels('Handover check')).length;
  for (let i = 1; i <= checks; i++) await t.clickLabel(`Handover check ${i}`);
  await t.clickText('+ ඡායාරූපයක්');
  await t.clickText('භාරදීමට සූදානම් ලෙස දන්වන්න');
  await t.clickText('අයිතිකරුගේ කේතයෙන් අවසන් කරන්න');
  const code = await t.page.evaluate(() => document.body.innerText.match(/නිවැරදි කේතය ([0-9]{6})/)?.[1]);
  await t.type('Owner close code', '000000');
  await t.clickLabel('Confirm owner code');
  t.check('a wrong code is rejected', await t.has('කේතය නොගැළපේ'));
  await t.type('Owner close code', code);
  await t.clickLabel('Confirm owner code');
  await t.clickText('සම්පූර්ණ');
  t.check('closed, warranty started', await t.has('වගකීම'));
  await t.shot('garage-workshop');
});
