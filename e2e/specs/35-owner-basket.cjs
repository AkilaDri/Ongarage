const { spec } = require('../lib.cjs');

// Owner parts basket: a service kit asked as one group of requests, shops answering part by part, the shop-by-shop compare with
// the cheapest mix, and reserving every part one shop has in one go (one purchase code).
module.exports = spec('Owner · parts basket, compare and reserve together', 'user', async (t) => {
  await t.clickText('OnMart');
  await t.clickLabel('Kit brake');
  await t.clickText('කොටස් 3 ම ඉල්ලන්න');
  await t.wait(500);
  await t.clickLabel('OnMart mine');
  t.check('the requests are one basket group', await t.has('කොටස් 3 ක ඉල්ලීම'));
  await t.wait(14000);
  t.check('the compare ranks shops by how much of the basket they have', (await t.has('වෙළඳසැල් අනුව')) && (await t.has('හැම කොටසකටම අඩුම මිල')));
  t.check('a shop can be reserved for all its parts at once', (await t.labels('Reserve ')).length > 0);
  await t.shot('owner-basket');
});
