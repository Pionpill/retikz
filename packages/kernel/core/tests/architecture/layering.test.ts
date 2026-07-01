import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');

const tsFiles = (dir: string): Array<string> => {
  const entries = readdirSync(dir);
  const files: Array<string> = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...tsFiles(path));
    } else if (entry.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
};

const importDeclarations = (file: string): Array<string> =>
  Array.from(
    readFileSync(file, 'utf8').matchAll(/(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"];?/gu),
    match => match[0],
  );

describe('core layer import boundaries', () => {
  it('contract code does not import from legacy primitive owner paths', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'contract'))
      .filter(file => !relative(join(SRC_ROOT, 'contract'), file).replace(/\\/g, '/').startsWith('scene/'))
      .flatMap(file =>
        importDeclarations(file)
          .filter(line => /from ['"]\.\.\/\.\.\/primitive/.test(line))
          .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
      );

    expect(offenders).toEqual([]);
  });

  it('contract code does not import from legacy geometry owner paths', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'contract')).flatMap(file =>
      importDeclarations(file)
        .filter(line => /from ['"]\.\.\/\.\.\/geometry/.test(line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });
});
