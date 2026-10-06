const { open, READY } = require('../lib.cjs');

// Every app loads its seed data without page errors.
module.exports = {
  name: 'All four apps load',
  run: async () => {
    const results = [];
    for (const app of ['user', 'garage', 'parts', 'tech']) {
      try {
        const t = await open(app, READY[app]);
        t.check(`${app} renders`, true);
        results.push(...(await t.close()).map((r) => ({ ...r, name: `${app}: ${r.name}` })));
      } catch (e) {
        results.push({ name: `${app} renders`, ok: false, detail: e.message });
      }
    }
    return results;
  },
};
