const { spec } = require('../lib.cjs');

// Owner Bids tab: each bid inside a posted job's card is its own swipe card. Swiping or
// tapping a bid opens that garage (not the whole job); the job card stays still and no
// text gets selected while dragging (that is what made cards flicker on the web).
module.exports = spec('Owner · bids: swipe a garage, not the job', 'user', async (t) => {
  const p = t.page;
  await t.clickText('ලංසු');

  const pointIn = (start) =>
    p.evaluate((s) => {
      const el = [...document.querySelectorAll('div')]
        .filter((e) => e.textContent.startsWith(s) && e.getBoundingClientRect().width > 0)
        .sort((a, b) => a.textContent.length - b.textContent.length)[0];
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + 10 };
    }, start);
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

  const swipe = await drag(await pointIn('Apex Motors'), -120, outerX);
  t.check('the job card stays still while a bid is swiped', swipe.seen.every((x) => x === 'translateX(0px)'), swipe.seen);
  t.check('no text selected while dragging', swipe.selected === '', swipe.selected);
  t.check('swiping a bid opens that garage, not the job', (await t.has('ඔබගේ රැකියාවට ලංසුව')) && !(await t.has('රැකියා විස්තර')));
  t.check('bid and garage profile agree', await t.has('★ 4.9 · සමාලෝචන 124'));
  await t.clickText('ලංසුව පිළිගන්න ·');
  t.check('accepting from the garage asks to confirm', await t.has('ලංසුව පිළිගන්නද?'));
  await t.clickText('අවලංගු');

  await drag(await pointIn('Mechanical'), 120);
  t.check('swiping the job header opens the job', await t.has('රැකියා විස්තර'));
  await t.clickLabel('Close details');

  await t.clickLabel('TOPCODE Tuning & Service bid details');
  t.check('tapping a bid opens its garage with reviews and replies', (await t.has('ඔබගේ රැකියාවට ලංසුව')) && (await t.has('TOPCODE Tuning & Service පිළිතුර')));
  await t.shot('owner-bids');
});
