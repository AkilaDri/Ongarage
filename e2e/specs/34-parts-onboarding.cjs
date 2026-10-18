const { spec } = require('../lib.cjs');

// Parts shop: the first-launch set-up (what the shop sells, for which vehicles), then the Catalogue tab and a reply
// to a customer that says "don't have it" and points to a neighbour. Starts without the automatic set-up.
module.exports = spec(
  'Parts shop · set-up wizard, catalogue and replies',
  'parts',
  async (t) => {
    t.check('the set-up opens on first launch', (await t.has('සැකසීම')) && (await t.has('ඔබ අලෙවි කරන්නේ මොනවාද?')));
    await t.clickText('ජපන් කාර් කොටස්');
    await t.clickText('ඊළඟ');
    t.check('the full list of part categories is shown', (await t.has('බ්‍රේක්')) && (await t.has('බැටරි')) && (await t.has('ටයර්')));
    await t.clickText('ඊළඟ');
    t.check('the vehicle step offers makes and part types', (await t.has('Toyota')) && (await t.has('කොටස් වර්ග')));
    await t.clickText('ඊළඟ');
    t.check('the review lists the catalogue', await t.has('ඔබේ Catalogue'));
    await t.clickText('අවසන් කරන්න');
    t.check('the app opens after set-up', await t.has('ගනුදෙනුකරු'));

    // The Catalogue tab replaces Stock; the price list is an optional segment
    await t.clickText('Catalogue');
    t.check('the catalogue lists what the shop sells', (await t.has('Toyota')) && (await t.has('Honda')));
    await t.clickLabel('Add catalogue line');
    t.check('a line can be added', await t.has('කොටස් ප්‍රවර්ගයක් එක් කරන්න'));
    await t.escape();
    await t.clickText('මිල ලැයිස්තුව');
    t.check('the optional price list keeps the old stock screen', await t.has('Brake'));

    // Reply "don't have it" and point to a neighbour
    await t.clickText('Requests');
    await t.clickText('ගනුදෙනුකරු');
    await t.clickInCard('නිමල් පෙරේරා', 'පිළිතුරු දෙන්න');
    t.check('each part is answered with have / none / will check', (await t.has('තියෙනවා')) && (await t.has('නැහැ')) && (await t.has('පරීක්ෂා කර දන්වමි')));
    await t.clickText('නැහැ');
    t.check('a "none" can point to neighbour shops', await t.has('අසල වෙළඳසැල්'));
    await t.shot('parts-onboarding');
  },
  { onboarding: false }
);
