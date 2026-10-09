const { spec } = require('../lib.cjs');

// Owner: the top bar folds away while a page / sheet is scrolled up, and comes back when it is scrolled down again
// (Activity, Bids, and the service-browse window's search bar).
module.exports = spec('Owner · top bars fold away while scrolling', 'user', async (t) => {
  const p = t.page;
  // Height of the folding wrapper around an element: the n-th ancestor with hidden overflow (the title bands are hidden-overflow themselves, so skip them).
  const wrapperHeight = (selector, skip = 1) =>
    p.evaluate(([sel, n]) => {
      const el = document.querySelector(sel);
      const hidden = [];
      for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).overflow === 'hidden') hidden.push(e);
      return Math.round(hidden[n].getBoundingClientRect().height);
    }, [selector, skip]);

  // Activity
  await t.clickText('Activity');
  await t.wait(1200);
  const activityOpen = await wrapperHeight('[role="heading"]');
  await p.mouse.move(195, 500);
  await p.mouse.wheel({ deltaY: 400 });
  await t.wait(1200);
  const activityFolded = await wrapperHeight('[role="heading"]');
  t.check('Activity: scrolling up folds the top bar away completely', activityOpen > 40 && activityFolded === 0, [activityOpen, activityFolded]);
  await p.mouse.wheel({ deltaY: -800 });
  await t.wait(1200);
  t.check('Activity: scrolling back down brings the top bar back', (await wrapperHeight('[role="heading"]')) === activityOpen);

  // Bids
  await t.clickText('Bids');
  await t.wait(1500);
  const bidsOpen = await wrapperHeight('[role="heading"]');
  await p.mouse.move(195, 600);
  await p.mouse.wheel({ deltaY: 300 });
  await t.wait(1500);
  const bidsFolded = await wrapperHeight('[role="heading"]');
  t.check('Bids: opening the sheet folds the top bar away completely', bidsOpen > 40 && bidsFolded === 0, [bidsOpen, bidsFolded]);
  await p.mouse.wheel({ deltaY: -900 });
  await t.wait(1500);
  t.check('Bids: lowering the sheet brings the top bar back', (await wrapperHeight('[role="heading"]')) === bidsOpen);

  // Service browse window: the search bar folds while the sheet is fully open
  await t.clickText('Home');
  await t.wait(800);
  await t.clickLabel('Service Mechanical');
  await t.wait(1800);
  const searchOpen = await wrapperHeight('[aria-label="Close screen"]', 0);
  await p.mouse.move(195, 650);
  await p.mouse.wheel({ deltaY: 300 });
  await t.wait(1500);
  const searchFolded = await wrapperHeight('[aria-label="Close screen"]', 0);
  t.check('Service browse: opening the sheet folds the search bar away', searchOpen > 40 && searchFolded === 0, [searchOpen, searchFolded]);
  await t.clickLabel('Minimize');
  await t.wait(1500);
  t.check('Service browse: minimising brings the search bar back', (await wrapperHeight('[aria-label="Close screen"]', 0)) === searchOpen);
});
