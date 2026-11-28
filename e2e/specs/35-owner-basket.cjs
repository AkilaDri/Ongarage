const { spec } = require('../lib.cjs');

// Owner parts basket: a service kit asked as one group of requests, shops answering part by part, the shop-by-shop compare with the cheapest mix
// (in the pop-up over the request card), picking one shop's parts into the cart and confirming them there: one order, collected at the shop.
module.exports = spec('Owner · parts basket, compare and reserve together', 'user', async (t) => {
  await t.clickText('OnMart');
  await t.clickLabel('Kit brake');
  await t.clickText('කොටස් 3 ම ඉල්ලන්න');
  await t.wait(500);
  await t.clickLabel('OnMart mine');
  t.check('the three parts are one request card', (await t.labels('Request')).length > 0 && (await t.labels('Part Brake')).length === 3);
  // A shop takes about 40 s to find a part.
  await t.wait(50000);
  // A new request waits under Pending and moves to Received when a shop has a part.
  await t.clickText('Received');
  await t.wait(900);
  await t.clickLabel('Open the cart');
  await t.wait(900);
  await t.clickLabel('Tab compare');
  await t.wait(900);
  t.check('the compare shows each shop\'s quotation and the cheapest for every part', (await t.labels('Quotation ')).length > 1 && (await t.has('හැම කොටසකටම අඩුම මිල')));
  await t.shot('owner-basket');
  // The last quotation: its parts are picked, then added to the cart.
  await t.clickLabel('Pick all');
  const add = (await t.page.evaluate(() => [...document.querySelectorAll('[aria-label$="parts to the cart"]')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('aria-label')))).pop();
  await t.clickLabel(add);
  await t.wait(2500);
  await t.clickLabel('Tab cart');
  await t.wait(900);
  const confirm = await t.labels('Confirm the order at ');
  t.check('the picked parts wait in the cart, shop by shop', confirm.length === 1, confirm);
  await t.clickLabel(confirm[0]);
  await t.wait(2500);
  // Confirming also opens the shop's chat, with the order and its code, over the pop-up: back out of the chat, then close the pop-up.
  await t.wait(1000);
  t.check('the order and its code are in the shop\'s chat', (await t.labels('Close code ')).length > 0);
  await t.clickLabel('Back');
  await t.wait(900);
  if ((await t.labels('Close sheet')).length > 0) await t.clickLabel('Close sheet');
  await t.wait(9000);
  t.check('the card shows where the reserved part is', await t.has('වෙන් කළ වෙළඳසැල්'));
  await t.clickLabel('OnMart orders');
  await t.wait(1500);
  t.check('the order is listed', (await t.labels('Order ')).length > 0);
});
