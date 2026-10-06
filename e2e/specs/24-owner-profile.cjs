const { spec } = require('../lib.cjs');

// Owner Profile: the account page, the edit page (tap the name), validation, the
// completion bar, and that details persist across a reload.
module.exports = spec('Owner · profile and edit details', 'user', async (t) => {
  const p = t.page;
  // Start clean (a previous run may have saved details on this browser profile).
  await p.evaluate(() => localStorage.removeItem('ongarage.owner.profile'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body.innerText.includes('Akila Drishan'), { timeout: 120000 });
  await t.wait(1200);

  await t.clickText('Account');
  t.check('profile shows the name and member pill, and no completion card', (await t.has('Akila Drishan')) && (await t.has('OnGarage සාමාජික')) && !(await t.has('දැන් සම්පූර්ණ කරන්න')));
  t.check('rows: theme, settings, help, about', (await t.has('යෙදුම් සැකසුම්')) && (await t.has('උදව් සහ සහාය')) && (await t.has('OnGarage ගැන')));

  await t.clickLabel('Edit profile');
  t.check('edit page lists the details', (await t.has('ඔබගේ පැතිකඩ')) && (await t.has('ජංගම දුරකථන අංකය')) && (await t.has('හදිසි සම්බන්ධතාව')));
  t.check('completion on the edit page', (await t.text('Profile completion')).includes('7 න් 2 ක් සම්පූර්ණයි'));

  // Email: invalid is refused, valid saves
  await t.clickLabel('Edit email');
  await t.type('Field email', 'not-an-email');
  await t.clickText('සුරකින්න');
  t.check('an invalid email is refused', await t.has('වලංගු ඊමේල් ලිපිනයක්'));
  await t.type('Field email', 'akila@example.com');
  await t.clickText('සුරකින්න');
  t.check('email saved', await t.has('akila@example.com'));

  // Phone validation
  await t.clickLabel('Edit phone');
  await t.type('Field phone', '12345');
  await t.clickText('සුරකින්න');
  t.check('an invalid phone number is refused', await t.has('වලංගු ශ්‍රී ලංකා දුරකථන'));
  await t.escape();

  // Birthday, gender, emergency contact, photo
  await t.clickLabel('Edit birthday');
  await t.type('Field birthday', '1995-08-21');
  await t.clickText('සුරකින්න');
  await t.clickLabel('Edit gender');
  await t.clickLabel('Gender male');
  await t.clickLabel('Edit emergency contact');
  await t.type('Field emergencyName', 'නිමල් පෙරේරා');
  await t.type('Field emergencyPhone', '0771234567');
  await t.clickText('සුරකින්න');
  await t.clickLabel('Toggle profile photo');
  t.check('all seven steps complete', (await t.text('Profile completion')).includes('7 න් 7 ක් සම්පූර්ණයි'));
  await t.shot('owner-edit-profile');

  // Persists across a reload; the completed card disappears from the profile page
  await t.clickLabel('Close profile');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body.innerText.includes('Akila Drishan'), { timeout: 120000 });
  await t.wait(1200);
  await t.clickText('Account');
  await t.clickLabel('Edit profile');
  t.check('saved details survive a reload', (await t.text('Profile completion')).includes('7 න් 7 ක් සම්පූර්ණයි'));
  await t.clickLabel('Close profile');

  // Name change shows in the header
  await t.clickLabel('Edit profile');
  await t.clickLabel('Edit name');
  await t.type('Field firstName', 'Kasun');
  await t.clickText('සුරකින්න');
  await t.clickLabel('Close profile');
  t.check('the Account tab has no header band', !(await t.has('Hi Kasun Drishan,')));
  await t.clickText('Home');
  t.check('the new name appears in the Home header', await t.has('Hi Kasun Drishan,'));
  await t.clickText('Account');

  // Help sheet
  await t.clickLabel('Open help');
  t.check('help sheet', await t.has('සහාය අමතන්න'));
  await p.evaluate(() => localStorage.removeItem('ongarage.owner.profile'));
});
