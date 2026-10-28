import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, '../..');

const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('共享源结构', () => {
  it('共享不重新导出数学点类型', () => {
    expect(source('src/shared/position.ts')).not.toMatch(/export\s+type\s+\{[^}]*\b(Position|Vector2)\b/);
  });

  it('核心消费者从 @retikz/math 导入数学点类型', () => {
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
