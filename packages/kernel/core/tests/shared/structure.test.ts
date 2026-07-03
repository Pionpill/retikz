import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('shared source structure', () => {
  it('shared does not re-export math point types', () => {
    expect(source('src/shared/position.ts')).not.toMatch(/export\s+type\s+\{[^}]*\b(Position|Vector2)\b/);
    expect(source('src/shared/geometry/point.ts')).not.toMatch(/type\s+(Position|Vector2)\b/);
    expect(source('src/shared/geometry/transform.ts')).not.toMatch(/\btype\s+CenteredShape\b/);
  });

  it('core consumers import math point types from @retikz/math', () => {
    const offenders = [
      ...sourceFiles('src').filter(path => {
        const importLines = source(path)
          .split('\n')
          .filter(line => /from ['"].*shared(?:\/geometry|\/geometry\/point)?['"]/.test(line));
        return importLines.some(line => /\b(Position|Vector2|CenteredShape)\b/.test(line));
      }),
    ];
    expect(offenders).toEqual([]);
  });
});

const sourceFiles = (dir: string): Array<string> => {
  const entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  return entries.flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
};
