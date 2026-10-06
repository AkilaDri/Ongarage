const { spec } = require('../lib.cjs');

// Owner: garage tiles (save toast, ratings sheet), history from closed
// records (receipt, warranty status, rating with moderation and the garage's reply),
// the OnGarage Guarantee on a protected job, and stopping a job at the diagnosis.
module.exports = spec('Owner · cards, history, receipts, ratings, Guarantee', 'user', async (t) => {
  // Home's garage tiles: saving shows a toast, a tile opens the garage with its ratings.
  await t.clickLabel('Save AutoTech Motors');
  t.check('saving shows a toast, not an alert', await t.has('සුරැකි ගරාජ වලට එක් කළා'));
  await t.clickLabel('Garage AutoTech Motors');
  t.check('garage sheet shows the four dimensions and its level', (await t.has('අවංක මිල')) && (await t.labels('Level ')).includes('Level premier'));
  await t.escape();

  await t.clickText('Activity');
  t.check('history from closed records', (await t.has('සම්පූර්ණ සින්තටික් ඔයිල් මාරුව')) && (await t.has('ඉදිරි බ්‍රේක් පෑඩ් මාරු කිරීම')));
  t.check('expired warranty shown', await t.has('වගකීම කල් ඉකුත් විය'));
  t.check('past review with the garage reply', (await t.has('ඔබ ★4.6 දුන්නා')) && (await t.has('ඊළඟ සේවාව')));
  await t.clickLabel('Open receipt');
  t.check('receipt number and total', (await t.page.evaluate(() => /OG-\d{6}-\d{4}/.test(document.body.innerText))) && (await t.has('ගෙවූ මුළු මුදල')));
  await t.escape();

  await t.clickLabel('Rate this job');
  for (const d of ['quality', 'pricing', 'onTime', 'communication']) await t.clickLabel(`Rate ${d} 4`);
  await t.clickLabel('Rate technician 5');
  await t.type('Review text', 'Good job, call me on 0771234567');
  await t.clickText('යවන්න · ★');
  t.check('phone numbers are blocked in reviews', await t.has('දුරකථන අංක'));
  await t.type('Review text', 'Good job, fair price');
  await t.clickText('යවන්න · ★');
  t.check('rated', await t.has('ඔබ ★4 දුන්නා'));
  await t.wait(6500);
  t.check('the garage replied', await t.has('ඔබව නැවත පිළිගැනීමට සතුටුයි'));

  // OnGarage Guarantee on the protected past job (Premier garage)
  t.check('protected job badge', (await t.labels('Protected job')).length > 0);
  await t.clickLabel('Guarantee claim');
  t.check('all four eligibility checks met', (await t.page.evaluate(() => (document.body.innerText.match(/✓ (ප්‍රිමියර් ගරාජයක|ඔබගේ QR|පැමිණීමේ සහ|වගකීම් කාලය)/g) || []).length)) === 4);
  await t.type('Guarantee reason', 'Engine oil leak came back twice, the garage says it is the sump and cannot fix it free');
  await t.type('Guarantee amount', '30000');
  t.check('split: garage deductible, guarantee the rest', (await t.has('රු. 5,000')) && (await t.has('රු. 25,000')));
  await t.clickText('ඉල්ලීම යවන්න');
  await t.wait(10000);
  t.check('garage responded, OnGarage approved', (await t.has('✅ අනුමතයි')) && (await t.has('OnGarage රු. 25,000')));

  // Accept a bid, then stop at the diagnosis: inspection fee only
  await t.clickText('Bids');
  await t.clickLabel('Mechanical details');
  await t.clickText('මෙම ලංසුව පිළිගන්න');
  await t.clickText('පිළිගන්න');
  await t.clickText('Activity');
  await t.wait(11000);
  await t.clickText('වාර්තාව බලා අනුමත කරන්න');
  await t.clickText('නවත්වන්න');
  await t.clickText('ඔව්, නවත්වන්න');
  t.check('stopped: inspection fee only', await t.has('ඔබ රැකියාව නැවැත්වූවා'));
  await t.shot('owner-history');
});
