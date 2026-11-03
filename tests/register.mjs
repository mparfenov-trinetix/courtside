// Lets node:test load app modules the way Metro and tsc do: the `@/` alias, extensionless paths and folder
// barrels (`index.ts`). Without it Node only follows fully spelled-out `.ts` paths.
import { statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(import.meta.dirname, '../src');
const SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

const isFile = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base;
    if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const hit = base && SUFFIXES.map((s) => base + s).find(isFile);
    return hit ? { url: pathToFileURL(hit).href, shortCircuit: true } : nextResolve(specifier, context);
  },
});
