// Browser tests for the four apps, driven through their web builds (React Native Web).
// The apps must already be running (npm run user / garage / parts / tech). Each spec
// opens a fresh page, so every run starts from the seeded mock data.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PORTS = { user: 8091, garage: 8092, parts: 8093, tech: 8094 };
const SHOTS = path.join(__dirname, 'shots');

/** An installed Chromium browser (no download): ONGARAGE_BROWSER, or Edge / Chrome. */
const browserPath = () => {
  const candidates = [
    process.env.ONGARAGE_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome / Edge found — set ONGARAGE_BROWSER to its path.');
  return found;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Opens one app on a phone-sized page and returns the helpers specs use. Checks are
 * collected (not thrown) so one run reports every failure; page errors and native
 * alerts count as failures too.
 */
const open = async (app, ready) => {
  const browser = await puppeteer.launch({ executablePath: browserPath(), headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  const results = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', async (d) => {
    errors.push(`native dialog: ${d.message()}`);
    await d.dismiss();
  });
  // Wait for the app's own seed text, not network quiet (Metro's live-reload socket can keep it busy).
  await page.goto(`http://localhost:${PORTS[app]}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 180000 }, ready);
  await wait(1500);

  // Clicks the element marked by `finder` (a function run in the page), in the middle,
  // after scrolling it into view — like a finger would.
  const tap = async (finder, arg) => {
    const ok = await page.evaluate(finder, arg);
    if (!ok) throw new Error(`not found: ${JSON.stringify(arg)}`);
    await wait(250);
    const h = await page.$('[data-t="x"]');
    await page.evaluate((e) => e.scrollIntoView({ block: 'center' }), h);
    await wait(150);
    const b = await h.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await wait(700);
  };

  const t = {
    page,
    wait,
    /** The pressable whose text includes `text` (the smallest, top-most one). */
    clickText: (text) =>
      tap((x) => {
        const m = [...document.querySelectorAll('[tabindex="0"]')].filter((e) => e.textContent.includes(x) && e.getBoundingClientRect().width > 0);
        const min = Math.min(...m.map((e) => e.textContent.length));
        document.querySelectorAll('[data-t]').forEach((e) => e.removeAttribute('data-t'));
        const el = m.filter((e) => e.textContent.length === min).pop();
        if (!el) return false;
        el.setAttribute('data-t', 'x');
        return true;
      }, text),
    /** The element with this accessibilityLabel (the top-most visible one). */
    clickLabel: (label) =>
      tap((x) => {
        document.querySelectorAll('[data-t]').forEach((e) => e.removeAttribute('data-t'));
        const el = [...document.querySelectorAll(`[aria-label="${x}"]`)].filter((e) => e.getBoundingClientRect().width > 0).pop();
        if (!el) return false;
        el.setAttribute('data-t', 'x');
        return true;
      }, label),
    /** A pressable with `text` inside the smallest card that also mentions `cardText`. */
    clickInCard: (cardText, text) =>
      tap(([s, x]) => {
        document.querySelectorAll('[data-t]').forEach((e) => e.removeAttribute('data-t'));
        const card = [...document.querySelectorAll('div')]
          .filter((e) => e.textContent.includes(s) && e.textContent.includes(x) && e.getBoundingClientRect().width > 0)
          .sort((a, b) => a.textContent.length - b.textContent.length)[0];
        const btn = card && [...card.querySelectorAll('[tabindex="0"]')].filter((e) => e.textContent.includes(x)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
        if (!btn) return false;
        btn.setAttribute('data-t', 'x');
        return true;
      }, [cardText, text]),
    /** Replaces the text of the input with this accessibilityLabel. */
    type: async (label, text) => {
      const h = (await page.$$(`[aria-label="${label}"]`)).pop();
      await h.click({ clickCount: 3 });
      await h.type(text);
      await wait(300);
    },
    has: (text) => page.evaluate((x) => document.body.innerText.includes(x), text),
    count: (text) => page.evaluate((x) => document.body.innerText.split(x).length - 1, text),
    labels: (prefix) => page.evaluate((p) => [...document.querySelectorAll(`[aria-label^="${p}"]`)].map((e) => e.getAttribute('aria-label')), prefix),
    text: (label) => page.evaluate((l) => document.querySelector(`[aria-label="${l}"]`)?.innerText.replace(/\s+/g, ' ') ?? '', label),
    escape: async () => {
      await page.keyboard.press('Escape');
      await wait(700);
    },
    shot: (name) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      return page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
    },
    /** Records a check; `detail` is printed when it fails. */
    check: (name, ok, detail) => results.push({ name, ok: !!ok, detail }),
    close: async () => {
      if (errors.length) results.push({ name: 'no page errors or native alerts', ok: false, detail: errors });
      await browser.close();
      return results;
    },
  };
  return t;
};

/** What the page shows once each app has loaded its seed data. */
const READY = { user: 'Akila Drishan', garage: 'ලැබුණු ඉල්ලීම්', parts: 'ගනුදෙනුකරු', tech: 'රාජකාරියට පැමිණෙන්න' };

/** A spec: a named flow in one app. A step that fails stops the flow but keeps the results. */
const spec = (name, app, flow) => ({
  name,
  run: async () => {
    const t = await open(app, READY[app]);
    try {
      await flow(t);
    } catch (e) {
      t.check('flow ran to the end', false, e.message);
    }
    return t.close();
  },
});

module.exports = { open, spec, PORTS, READY, wait };
