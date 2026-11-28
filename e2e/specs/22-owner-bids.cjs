const { spec } = require('../lib.cjs');

// Owner Bids tab: each bid inside a posted job's card is its own swipe card. Swiping or
// tapping a bid opens that garage (not the whole job); the job card stays still and no
// text gets selected while dragging (that is what made cards flicker on the web).
module.exports = spec('Owner · bids: swipe a garage, not the job', 'user', async (t) => {
  const p = t.page;
  await t.clickText('Bids');
  // The sheet and its cards settle before the finger moves.
  await t.wait(1500);

  // A point near the top of the element with this accessibility label.
  const pointIn = (label) =>
    p.evaluate((l) => {
      const el = [...document.querySelectorAll(`[aria-label="${l}"]`)].find((e) => e.getBoundingClientRect().width > 0);
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 10 };
    }, label);
  // Drags like a finger: small steps, a frame apart.
  const drag = async (pt, dx, during) => {
    await p.mouse.move(pt.x, pt.y);
    await p.mouse.down();
    const seen = [];
    for (let i = 1; i <= 10; i++) {
      await p.mouse.move(pt.x + (dx * i) / 10, pt.y + (i % 2));
      await t.wait(16);
      if (during) seen.push(await during());
    }
    const selected = await p.evaluate(() => window.getSelection().toString());
    await p.mouse.up();
    await t.wait(900);
    return { seen, selected };
  };
  const swipe = await drag(await pointIn('Apex Motors & Hybrid Hub bid details'), -120);
  await t.wait(900);
  t.check('no text selected while dragging', swipe.selected === '', swipe.selected);
  t.check('swiping a bid opens that garage, not the job', (await t.labels('Accept this bid')).length > 0 && !(await t.has('රැකියා විස්තර')));
  t.check('bid and garage profile agree', (await t.has('4.9')) && (await t.has('124')));
  await t.clickLabel('Accept this bid');
  t.check('accepting from the garage asks to confirm', await t.has('ලංසුව පිළිගන්නද?'));
  await t.clickText('අවලංගු');
  // Declining the confirmation leaves the garage's profile open.
  await t.escape();
  await t.wait(900);

  // The job's own card does not swipe; its details open from the link.
  await drag(await pointIn('Mechanical details'), 120);
  t.check('swiping the job card does not open the job', !(await t.has('රැකියා විස්තර')));
  // A sideways swipe off a swipe card moves between the main tabs.
  if ((await t.labels('Mechanical details')).length === 0) {
    await t.clickText('Bids');
    await t.wait(1500);
  }
  await t.clickLabel('Mechanical details');
  t.check('the details link opens the job', await t.has('රැකියා විස්තර'));
  // Regression: the live countdown re-renders this screen every second, and that used to restart the details view's fade-in, so it flashed.
  await t.wait(700);
  const opacities = [];
  for (let i = 0; i < 6; i++) {
    opacities.push(await p.evaluate(() => {
      const els = [...document.querySelectorAll('div')].filter((e) => e.style.opacity !== '' && e.textContent.includes('රැකියා විස්තර'));
      els.sort((x, y) => y.textContent.length - x.textContent.length);
      return els.length ? Number(els[0].style.opacity) : 1;
    }));
    await t.wait(450);
  }
  t.check('the open details view does not flash (stays fully opaque across countdown ticks)', opacities.every((o) => o >= 0.99), opacities);
  await t.clickLabel('Close details');

  await t.clickLabel('TOPCODE Tuning & Service bid details');
  t.check('tapping a bid opens its garage with reviews and replies', (await t.labels('Accept this bid')).length > 0 && (await t.has('ගෙන් පිළිතුර')));
  await t.escape();

  // The page is a list; the map opens from the button in the header. Notices (a service reminder) can cover that corner for a while.
  await t.wait(14000);
  await t.clickLabel('Open the map');
  await t.wait(2000);
  t.check('the map opens with its own close button and the bid count', (await t.labels('Close the map')).length > 0 && (await t.has('ලංසු')));
  await t.shot('owner-bids-map');
  await t.clickLabel('Close the map');
  await t.wait(1200);
  t.check('closing the map brings the list back', (await t.labels('Close the map')).length === 0 && (await t.labels('Apex Motors & Hybrid Hub bid details')).length > 0);
  await t.shot('owner-bids');
});
