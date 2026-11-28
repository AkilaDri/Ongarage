// Owner-app steps that several specs share.

/**
 * After a quote is accepted in Bids: pick the soonest time, leave the vehicle, ask the garage for it, then (once it confirms and takes the vehicle in)
 * confirm the handover in Activity and wait for the inspection report. The job moves from Bids to Activity only when the garage confirms.
 */
const bookToReport = async (t) => {
  if (!(await t.has('ඉක්මන්ම'))) await t.clickText('වේලාවක් තෝරන්න');
  await t.wait(900);
  await t.clickText('ඉක්මන්ම');
  await t.clickText('තහවුරු කරන්න');
  await t.wait(600);
  // Confirming the soonest time may move straight on to the staying question.
  if ((await t.labels('I will leave the vehicle')).length === 0) await t.clickText('ඊළඟ ›');
  await t.clickLabel('I will leave the vehicle');
  await t.clickText('ඊළඟ ›');
  await t.clickText('වේලාව ඉල්ලන්න');
  // The simulated garage answers after 30 s: it confirms a time inside its hours, otherwise it offers another to accept.
  await t.wait(2000);
  if (await t.has('හරි')) await t.clickText('හරි').catch(() => {});
  await t.wait(31000);
  if (await t.has('යෝජිත වේලාව')) await t.clickText('පිළිගන්න');
  await t.clickText('Activity');
  await t.wait(12000);
  await t.clickLabel('Confirm handed over');
  // The inspection takes about 40 s in the simulation.
  await t.wait(43000);
};

module.exports = { bookToReport };
