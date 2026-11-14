import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const config = readFileSync(resolve(projectRoot, 'src/data/assets.ts'), 'utf8');
const paths = [...config.matchAll(/art\('([^']+)'\)/g)].map((match) => resolve(projectRoot, 'src/data', match[1]));

for (const source of new Set(paths)) {
  if (!existsSync(source)) throw new Error(`Configured artwork is missing: ${relative(projectRoot, source)}`);
  const artworkPath = relative(resolve(projectRoot, 'art'), source);
  if (artworkPath.startsWith('..')) throw new Error(`Artwork must live inside the art folder: ${relative(projectRoot, source)}`);
  const destination = resolve(projectRoot, 'dist/art', artworkPath);
  mkdirSync(resolve(destination, '..'), { recursive: true });
  cpSync(source, destination);
}

