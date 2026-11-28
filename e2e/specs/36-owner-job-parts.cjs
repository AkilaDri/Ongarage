const { spec } = require('../lib.cjs');

// Owner parts for a running job: staying at the garage, the discs become a task (not an approval); prices are asked from the job card, an offer is
// chosen and collected in the pop-up over the card, and the part is done only when the garage has checked it.
module.exports = spec('Owner · job part, from the task to the garage check', 'user', async (t) => {
  await t.clickText('Activity');
  await t.clickLabel('I am at the garage');
  // About 20 s for the talk about the waiting report, then the repair finds the discs.
  await t.wait(34000);
  t.check('the part is a task, with no approval asked', (await t.has('ඔබ කොටසක් ගෙන ආ යුතුයි')) && !(await t.has('අමතර වැඩ බලා අනුමත කරන්න')));
  t.check('the owner can say they did not agree', (await t.labels('I did not agree to Brake disc')).length > 0);
  await t.clickLabel('Ask prices for Brake disc');
  await t.clickText('කොටස් 1 ම ඉල්ලන්න');
  await t.wait(800);
  t.check('the card shows the request is waiting', await t.has('පිළිතුරු බලාපොරොත්තුවෙන්'));
  await t.wait(45000);
  await t.clickLabel('Open the part Brake disc');
  const offers = await t.labels('Offer from ');
  t.check('offers open over the job card', offers.length > 0);
  await t.shot('owner-job-part-offers');
  await t.clickLabel(offers[0]);
  await t.clickLabel('Collect the part');
  await t.clickText('වෙන් කරන්න');
  await t.wait(1000);
  t.check('collection code in the pop-up', (await t.labels('Close code')).length > 0);
  await t.wait(9000);
  await t.clickText('කොටස පරීක්ෂා කර මිලදී ගන්න');
  await t.shot('owner-job-part-counter');
  await t.clickText('කොටස නිවැරදි වර්ගයයි');
  await t.clickText('කොටස හොඳ තත්ත්වයේ ඇත');
  await t.clickText('ප්‍රමාණය නිවැරදියි');
  await t.clickText('මිල සහ වගකීම');
  await t.clickText('මිලදී ගන්න ·');
  await t.wait(1000);
  t.check('bought, but still to be given to the garage', await t.has('ගරාජයට භාර දුන්නා'));
  await t.clickText('ගරාජයට භාර දුන්නා');
  await t.wait(11500);
  // The demo garage turns down the first Brake disc handed in (a demonstration only), so the way back can be tried.
  t.check('a wrong part is not done: the return steps show', await t.has('වැරදි කොටසක්'));
  await t.clickText('වෙළඳසැලට ආපසු දෙන්න');
  await t.wait(1500);
  t.check('after the return the part can be asked for again', await t.has('මිල ඉල්ලන්න'));
  await t.shot('owner-job-part-done');
});
