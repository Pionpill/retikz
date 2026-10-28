import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, '../..');

const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('解析源结构', () => {
  it('将频道和标记域解析排除在提供者之外', () => {
    for (const path of [
      'src/resolve/channel/index.ts',
      'src/resolve/channel/types.ts',
      'src/resolve/channel/resolve.ts',
      'src/resolve/mark/index.ts',
      'src/resolve/mark/types.ts',
      'src/resolve/mark/resolve.ts',
    ]) {
      expect(existsSync(resolve(root, path))).toBe(true);
    }

    for (const path of ['src/providers/channel/registry.ts', 'src/providers/mark/registry.ts']) {
      expect(source(path)).not.toMatch(
        /resolveMarkChannels|markDefinitionOf|parseMarkOperation|channelKindsForMark|datumAnchor/,
      );
    }
  });

  it('不允许管线直接查找 Channel 或 Mark 注册表', () => {
    for (const path of [
      'src/pipeline/source-fields.ts',
      'src/pipeline/expand/lower.ts',
      'src/pipeline/expand/legend.ts',
      'src/pipeline/locator/locate.ts',
    ]) {
      expect(source(path)).not.toMatch(/(?:channelRegistry|markRegistry)\.get\(/);
    }
  });
});
