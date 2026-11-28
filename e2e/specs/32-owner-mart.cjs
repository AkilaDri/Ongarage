const { spec } = require('../lib.cjs');

// Owner OnMart: nearby shops and filters, a part search with live-stock availability, asking every nearby shop,
// reserving the offer, the purchase code, inspecting and buying at the counter, the warranty card and rating;
// service kits and the open wall.
module.exports = spec('Owner · OnMart search, reserve and buy', 'user', async (t) => {
  await t.clickText('OnMart');
  t.check('opens on nearby shops, ranked without commissions', (await t.has('Galle Auto Parts')) && (await t.has('ගරාජවල කොමිස් මත රඳා නොපවතී')));
  t.check('OnMart sections use the bottom navigation', (await t.labels('OnMart shops')).length > 0 && (await t.labels('OnMart mine')).length > 0 && (await t.labels('OnMart wall')).length > 0 && (await t.labels('OnMart orders')).length > 0);
  t.check('the page opens with Home\'s top: the vehicle and the two actions', (await t.labels('Choose another vehicle')).length > 0 && (await t.labels('Ask for a part')).length > 0 && (await t.labels('Open wall shortcut')).length > 0);
  await t.clickLabel('Show map');
  await t.wait(500);
  t.check('nearby shop map shows the owner and shop locations', (await t.labels('My location')).length > 0 && (await t.labels('Map shop')).length > 0);
  await t.clickLabel('Close map');
  await t.wait(500);
  t.check("Quick Parts shows the vehicle's part categories", (await t.labels('Part group engine')).length > 0 && (await t.labels('Part group electrical')).length > 0 && (await t.labels('Part group hybrid')).length > 0 && (await t.labels('Part group suspension')).length > 0);
  await t.clickLabel('Open shop stock');
  t.check('shop stock opens in a separate window', (await t.has('වෙළඳසැල් තොගයේ කොටස්')) && (await t.has('Galle Auto Parts')));
  await t.clickLabel('Close shop stock');
  t.check('the landing page: ad banners, offer tiles, kits and deals', (await t.has('දැන්වීම')) && (await t.has('ගනුදෙනු සහ දීමනා')) && (await t.has('සේවා කට්ටල')) && (await t.has('ඔබට ළඟම දීමනා')));
  t.check('deal cards show the discount', await t.has('−15%'));
  t.check('shop rows: one nearby row with its three choices, and the paid Featured row', (await t.has('විශේෂාංග · දැන්වීම්')) && (await t.has('ඔබට ළඟම')) && (await t.has('ඉහළ ශ්‍රේණිය')) && (await t.has('ඉක්මන් පිළිතුරු')));
  await t.clickLabel('Part group brakes');
  t.check('a part group opens the search with availability', (await t.has('Brake pads (front)')) && (await t.has('✓ තොගයේ ඇත')));
  await t.clickLabel('Clear search');
  await t.clickLabel('Sort price');
  t.check('shops can be sorted', await t.has('Galle Auto Parts'));

  // Service kit comparison
  await t.clickLabel('Kit brake');
  t.check('the kit shows which shops have every part and the total', (await t.has('බ්‍රේක් සේවාව')) && (await t.has('3/3 තොගයේ')));
  await t.escape();

  // Search a part: live-stock shops say whether they have it
  await t.type('Search parts', 'brake pad');
  t.check('availability shows on the shops that publish stock', (await t.has('✓ තොගයේ ඇත')) && (await t.has('Brake pads (front)')));
  await t.clickText('සියලු වෙළඳසැල්වලින් අසන්න');
  t.check('a named part opens the request at its details', (await t.has('OnMart ඉල්ලීම')) && (await t.has('කොටස විස්තර කරන්න')));
  await t.clickText('ඊළඟ ›');
  await t.clickText('ඊළඟ ›');
  t.check('the summary carries the part and the vehicle before sending', (await t.has('ඔබේ ඉල්ලීම')) && (await t.has('Brake pads')) && (await t.has('Premio')));
  await t.clickText('ඉල්ලීම වෙළඳසැල් වෙත යවන්න');
  // A shop takes about 40 s to find a part. The offers are cards on the request.
  await t.wait(45000);
  // Answered, so it has moved from Pending to Received.
  await t.clickText('Received');
  await t.wait(900);
  t.check('offers arrive with a price tag and a fitment note', (await t.has('Galle Auto Parts')) && (await t.has('වෙළඳපොළ මිල')) && (await t.has('ගැළපෙන බව වෙළඳසැල තහවුරු කළා')));

  // Reserve at Galle Auto Parts through the cart: confirmed there, collected at the shop with a code
  await t.clickInCard('Galle Auto Parts', 'Add to cart');
  await t.wait(1500);
  await t.clickLabel('Open the cart');
  await t.wait(900);
  await t.clickLabel('Confirm the order at Galle Auto Parts');
  await t.wait(1500);
  t.check('the order lists the purchase code', (await t.labels('Close code')).length > 0);
  // Back out of the shop's chat, then close the pop-up.
  await t.clickLabel('Back');
  await t.wait(900);
  if ((await t.labels('Close sheet')).length > 0) await t.clickLabel('Close sheet');
  await t.wait(9000);
  await t.clickLabel('OnMart orders');
  await t.wait(1200);
  await t.clickLabel('Order Brake pads (front)');
  await t.wait(1200);
  t.check('the shop got it ready', await t.has('කවුන්ටරයේ ඇත — කොටස පරීක්ෂා කරන්න'));

  // At the counter: inspect, then buy
  await t.clickText('කවුන්ටරයේ ඇත — කොටස පරීක්ෂා කරන්න');
  await t.clickText('කොටස නිවැරදි වර්ගයයි');
  await t.clickText('කොටස හොඳ තත්ත්වයේ ඇත');
  await t.clickText('ප්‍රමාණය නිවැරදියි');
  await t.clickText('මිල සහ වගකීම');
  await t.clickText('මිලදී ගන්න ·');
  t.check('bought: warranty card and invoice', (await t.has('වගකීම')) && (await t.has('බිල්පත INV-')));
  await t.clickLabel('Rate 5 stars');
  t.check('a verified purchase can be rated', await t.has('ඔබගේ ශ්‍රේණිය'));
  await t.shot('owner-mart-bought');

  // The open wall (the order's record is closed first: it lies over the bottom bar)
  for (let i = 0; i < 3 && (await t.labels('Close sheet')).length > 0; i++) {
    await t.clickLabel('Close sheet');
    await t.wait(900);
  }
  await t.clickLabel('OnMart wall');
  await t.wait(600);
  t.check('the wall is a feed: a "what part do you need?" box and other owners\' posts', (await t.has('ඔබට අවශ්‍ය දුර්ලභ කොටස කුමක්ද?')) && (await t.has('Toyota Aqua headlamp')) && (await t.has('Honda Fit Hybrid IMA battery')));
  t.check('the wall has no search box and no separate post button', (await t.labels('Search wall posts')).length === 0 && !(await t.has('පෝස්ට් කරන්න')));
  t.check('category buttons sit above the feed', (await t.labels('Filter Mechanical')).length > 0 && (await t.labels('Filter Hybrid / EV')).length > 0);

  // Like and comment
  // The like count sits beside the comment count, above the actions of the same post (the last one on the page).
  const likes = () => t.page.evaluate(() => {
    const comments = [...document.querySelectorAll('[aria-label="Comments"]')].pop();
    return Number((comments.parentElement.firstElementChild.innerText.match(/\d+/) || [NaN])[0]);
  });
  const before = await likes();
  await t.clickLabel('Like post');
  t.check('a like is counted', (await likes()) === before + 1, [before, await likes()]);
  await t.clickLabel('Comment on post');
  t.check('comments open with a box to write one', (await t.labels('Write a comment')).length > 0);

  // Tell the poster directly that you have the part
  await t.clickLabel('I have this part');
  t.check('"I have it" opens a private reply to the poster', await t.has('පෝස්ට් කළ අයට පෞද්ගලිකව දැනුම් දෙන්න'));
  await t.clickLabel('Send reply to poster');
  t.check('the poster is told directly', await t.has('සෘජුවම දැනුම් දුන්නා'));
  // The reply opens a private chat with the poster: back to the feed.
  await t.wait(1500);
  if ((await t.labels('Back')).length > 0) await t.clickLabel('Back');
  await t.wait(900);

  // Filter by service category
  await t.page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; }); });
  await t.wait(300);
  await t.clickLabel('Filter Hybrid / EV');
  await t.wait(400);
  t.check('a category button filters the posts', (await t.has('Honda Fit Hybrid IMA battery')) && !(await t.has('Toyota Aqua headlamp')));
  await t.clickLabel('Filter සියල්ල');
  await t.wait(400);

  // Post a part of your own, find it under "my posts", then delete it
  await t.clickLabel('What part do you need?');
  await t.wait(800);
  // Nothing is known yet, so it starts at step 1 (part and vehicle).
  await t.clickText('ඊළඟ ›');
  await t.type('Part name', 'Wagon R wiper motor');
  await t.clickText('ඊළඟ ›');
  await t.clickText('ඊළඟ ›');
  await t.clickText('ඉල්ලීම වෙළඳසැල් වෙත යවන්න');
  await t.wait(1500);
  await t.clickText('මගේ පෝස්ට් (');
  await t.wait(500);
  t.check('"my posts" shows only my post', (await t.has('Wagon R wiper motor')) && !(await t.has('Toyota Aqua headlamp')));
  await t.clickLabel('Delete my post');
  t.check('deleting asks first', await t.has('මෙම පෝස්ට් එක මකන්නද?'));
  await t.clickLabel('Confirm delete post');
  await t.wait(600);
  t.check('the post is deleted from my posts', await t.has('ඔබගේ පෝස්ට් නැත'));
});
