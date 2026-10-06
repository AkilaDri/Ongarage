const { spec } = require('../lib.cjs');

// Owner: the seeded brake job end to end — approve some lines, extra work, handover,
// report a problem (AI topic), rework, show the code, rate, warranty claim; then a bid on
// a Genuine post: Recon approval; another stopped at the diagnosis.
module.exports = spec('Owner · workshop job, extra work, problem, rating, Recon', 'user', async (t) => {
  await t.clickText('Activity');
  t.check('diagnosis waiting for approval', await t.has('පරීක්ෂා වාර්තාව ඔබගේ අනුමැතියට'));
  await t.clickText('වාර්තාව බලා අනුමත කරන්න');
  const lines = (await t.labels('Approve line ')).map((l) => l.slice(13));
  await t.clickLabel(`Approve line ${lines[lines.length - 1]}`);
  t.check('unticking a line lowers the total', await t.has('අනුමත කරන්න · රු. 10,650'));
  await t.clickText('අනුමත කරන්න ·');
  await t.wait(9000);

  t.check('garage asks for extra work; no handover yet', (await t.has('අමතර වැඩ බලා අනුමත කරන්න')) && !(await t.has('භාරගන්න · කේතය පෙන්වන්න')));
  await t.clickText('අමතර වැඩ බලා අනුමත කරන්න');
  await t.clickLabel('Approve line Disc fitting');
  await t.clickText('අනුමත කරන්න ·');
  await t.wait(9000);

  await t.clickText('භාරගන්න · කේතය පෙන්වන්න');
  t.check('handover report and bill', (await t.has('ගරාජයේ පරීක්ෂා ලැයිස්තුව')) && (await t.has('Brake disc')) && !(await t.has('Disc fitting')));
  await t.clickText('ගැටලුවක් ඇත');
  await t.type('Problem description', 'Brakes still make a noise and the job is poor quality');
  await t.wait(900);
  t.check('AI suggests the topic', await t.has('✨ යෝජනාව: වැඩේ හරි නැහැ'));
  await t.clickText('ගරාජයට යවන්න');
  await t.wait(4500);
  t.check('garage reworks it', await t.has('නැවත හදමින්'));
  await t.wait(8500);
  t.check('ready again, escalation offered', (await t.has('භාරගන්න · කේතය පෙන්වන්න')) && (await t.has('OnGarage වෙත යොමු කරන්න')));

  await t.clickText('භාරගන්න · කේතය පෙන්වන්න');
  await t.clickText('හරි — කේතය පෙන්වන්න');
  t.check('QR with the 6-digit code', (await t.labels('Close code ')).length === 1);
  await t.wait(5800);
  await t.clickText('ශ්‍රේණිගත කරන්න');
  t.check('technician rated separately', await t.has('රුවන් පෙරේරා'));
  for (const d of ['quality', 'pricing', 'onTime', 'communication']) await t.clickLabel(`Rate ${d} 5`);
  await t.clickLabel('Rate technician 5');
  await t.clickText('යවන්න · ★');
  t.check('closed and rated', await t.has('ඔබ ★5 දුන්නා'));
  await t.clickText('වගකීම් ඉල්ලීමක්');
  await t.type('Warranty claim description', 'The brake noise is back again after a week');
  await t.clickText('ගරාජයට යවන්න');
  await t.wait(5500);
  t.check('warranty claim accepted', await t.has('ගරාජය වගකීම පිළිගත්තා'));

  // A bid on a Genuine post: Recon asked → approved; the bill drops
  await t.clickText('Bids');
  await t.clickLabel('Mechanical details');
  t.check('bids show level badges', (await t.labels('Level ')).length > 0);
  await t.clickText('මෙම ලංසුව පිළිගන්න');
  await t.clickText('පිළිගන්න');
  await t.clickText('Activity');
  await t.wait(11000);
  await t.clickText('වාර්තාව බලා අනුමත කරන්න');
  await t.clickText('අනුමත කරන්න ·');
  await t.wait(3200);
  await t.clickText('Recon අවසරය ඉල්ලයි');
  await t.clickText('Recon අනුමතයි');
  await t.wait(9000);
  await t.clickText('භාරගන්න · කේතය පෙන්වන්න');
  t.check('handover notes the Recon saving', await t.has('ඔබගේ අවසරයෙන් Recon යෙදුවා'));
  await t.shot('owner-workshop');
});
