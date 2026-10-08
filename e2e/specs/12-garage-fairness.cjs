const { spec } = require('../lib.cjs');

// Garage: fair-share intake (TOPCODE is flagged), direct bookings moved to the next free
// day, the subscription and its value guarantee.
module.exports = spec('Garage · fair share and subscription', 'garage', async (t) => {
  await t.clickText('Profile');
  t.check('limit active, Pro recommended by earnings band', (await t.has('දෛනික සීමාව ක්‍රියාත්මකයි')) && (await t.has('ඔබට ගැළපෙන සැලැස්ම: Pro')));
  await t.clickLabel('Open fair share and plan');
  t.check('reasons shown', (await t.has('ECU')) && (await t.has('මාසික සාමාන්‍ය ආදායම')));
  t.check('tomorrow 71,200 / 75,000', (await t.text('Intake day 1')).includes('රු. 71,200 / රු. 75,000'));
  await t.escape();

  await t.clickText('Jobs');
  t.check('feed banner shows tomorrow\'s room', (await t.text('Intake banner')).includes('රු. 3,800'));
  t.check('a job that does not fit is locked', (await t.count('හෙට දෛනික සීමාව පිරී ඇත')) >= 1);
  t.check('rising garages see new posts first', await t.has('නව ගරාජවලට පළමුව'));

  await t.clickText('ඍජු ඉල්ලීම්');
  await t.clickInCard('Axio', 'පිළිතුරු දෙන්න');
  t.check('reply sheet warns the day is full', await t.has('එදින දෛනික සීමාව පිරී ඇත'));
  await t.clickText('වෙන්කිරීම තහවුරු කරන්න');
  t.check('moved to the next free day, not refused', await t.has('ප්‍රතික්ෂේප නොකර ඉඩ ඇති ඊළඟ දිනය'));

  await t.clickText('Profile');
  await t.clickLabel('Open fair share and plan');
  await t.clickText('Pro අරඹන්න');
  t.check('value guarantee shown', await t.has('වටිනාකම් සහතිකය'));
  t.check('plan triples the room', (await t.text('Intake day 1')).includes('රු. 225,000'));
  await t.escape();
  await t.clickText('Jobs');
  t.check('bids open again', (await t.count('හෙට දෛනික සීමාව පිරී ඇත')) === 0);
  await t.shot('garage-fairness');
});
