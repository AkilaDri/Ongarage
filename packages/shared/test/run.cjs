// Unit tests for the shared rules: the AI decisions layer, marketplace rules and the
// workshop maths. These modules are plain TypeScript (no React Native), so they are
// compiled to CommonJS with the TypeScript compiler and run with Node's test runner.
//
//   npm test                       (from the repo root)
//   node packages/shared/test/run.cjs
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, '.test-build');
// Only logic: no UI, theme or map code.
const COMPILE = ['types.ts', 'utils', 'constants', 'ai', 'marketplace'];

const filesIn = (p) => {
  const full = path.join(SRC, p);
  if (fs.statSync(full).isFile()) return [p];
  return fs.readdirSync(full).flatMap((f) => filesIn(path.join(p, f)));
};

fs.rmSync(OUT, { recursive: true, force: true });
for (const file of COMPILE.flatMap(filesIn).filter((f) => f.endsWith('.ts'))) {
  const { outputText, diagnostics } = ts.transpileModule(fs.readFileSync(path.join(SRC, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: file,
  });
  if (diagnostics?.length) {
    console.error(`Could not compile ${file}`);
    process.exit(1);
  }
  const dest = path.join(OUT, file.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, outputText);
}

const tests = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.cjs'))
  .map((f) => path.join(__dirname, f));
const run = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(run.status ?? 1);
