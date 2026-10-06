const { spec } = require('../lib.cjs');

// Owner Bids tab: each bid inside a posted job's card is its own swipe card. Swiping or
// tapping a bid opens that garage (not the whole job); the job card stays still and no
// text gets selected while dragging (that is what made cards flicker on the web).
module.exports = spec('Owner · bids: swipe a garage, not the job', 'user', async (t) => {
  const p = t.page;
  await t.clickText('Bids');

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
  // The outermost card (the job) — its translateX while a bid is dragged.
  const outerX = () =>
    p.evaluate(() => {
      const cards = [...document.querySelectorAll('div')].filter((e) => e.style.transform && e.textContent.includes('Mechanical') && e.textContent.includes('Apex Motors'));
      cards.sort((a, b) => b.textContent.length - a.textContent.length);
      return cards[0]?.style.transform ?? '';
    });

  const swipe = await drag(await pointIn('Apex Motors & Hybrid Hub bid details'), -120, outerX);
  t.check('the job card stays still while a bid is swiped', swipe.seen.every((x) => x === 'translateX(0px)'), swipe.seen);
  t.check('no text selected while dragging', swipe.selected === '', swipe.selected);
  t.check('swiping a bid opens that garage, not the job', (await t.has('ඔබගේ රැකියාවට ලංසුව')) && !(await t.has('රැකියා විස්තර')));
  t.check('bid and garage profile agree', await t.has('★ 4.9 · සමාලෝචන 124'));
  await t.clickText('ලංසුව පිළිගන්න ·');
  t.check('accepting from the garage asks to confirm', await t.has('ලංසුව පිළිගන්නද?'));
  await t.clickText('අවලංගු');

  await drag(await pointIn('Mechanical details'), 120);
  t.check('swiping the job header opens the job', await t.has('රැකියා විස්තර'));
  await t.clickLabel('Close details');

  await t.clickLabel('TOPCODE Tuning & Service bid details');
  t.check('tapping a bid opens its garage with reviews and replies', (await t.has('ඔබගේ රැකියාවට ලංසුව')) && (await t.has('TOPCODE Tuning & Service පිළිතුර')));
  await t.escape();

  // The map is full screen behind a three-stage sheet: tap the handle to step up, flick down to minimise.
  const height = () => p.evaluate(() => document.querySelector('[aria-label="Sheet handle"]').parentElement.getBoundingClientRect().height);
  // Tapping the handle steps through the heights (whatever the sheet starts at).
  const seen = [await height()];
  for (let i = 0; i < 2; i++) {
    await t.clickLabel('Sheet handle');
    seen.push(await height());
  }
  t.check('tapping the handle changes the sheet height', Math.max(...seen) - Math.min(...seen) > 100, seen);
  if (seen[2] > seen[1] + 100 || seen[2] > 600) await t.clickLabel('Sheet handle');
  const hb = await (await p.$('[aria-label="Sheet handle"]')).boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + 10);
  await p.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await p.mouse.move(hb.x + hb.width / 2, hb.y + 10 + i * 40);
    await t.wait(16);
  }
  await p.mouse.up();
  await t.wait(1200);
  const peek = await height();
  t.check('a flick down minimises it to a strip', peek < 160, peek);
  t.check('the minimised strip shows each received bid as a round photo', (await t.labels('Peek ')).length === 2 && (await t.has('3.7k')));
  await t.clickLabel('Peek Apex Motors & Hybrid Hub');
  t.check('tapping a photo opens that garage', await t.has('ඔබගේ රැකියාවට ලංසුව'));
  await t.shot('owner-bids');
});
