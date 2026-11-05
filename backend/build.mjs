// Bundles the API into one ESM file for Vercel, so the deployed function needs no
// TypeScript compilation and no workspace link to @laporte/shared at runtime.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((d) => d !== '@laporte/shared');

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external,
  alias: { '@laporte/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
  logLevel: 'info',
});
