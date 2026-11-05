// Bundles the API into one CommonJS file for Vercel, so the deployed function needs no
// TypeScript compilation and no workspace link to @laporte/shared at runtime. CommonJS avoids the
// "Cannot use import statement outside a module" crash: the function folder has no package.json
// declaring "type": "module", so Node loads .js files as CommonJS.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((d) => d !== '@laporte/shared');

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  // The Express app is the module itself (module.exports = app), which is what Vercel expects.
  footer: { js: 'module.exports = module.exports.default || module.exports;' },
  target: 'node20',
  sourcemap: true,
  external,
  alias: { '@laporte/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
  logLevel: 'info',
});

// Mark dist/ as CommonJS too, so it also runs locally (backend/package.json says type: module).
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/package.json', import.meta.url), `${JSON.stringify({ type: 'commonjs' })}\n`);
