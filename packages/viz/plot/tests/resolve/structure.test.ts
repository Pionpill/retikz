import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('resolve source structure', () => {
  it('keeps Channel and Mark domain resolution out of providers', () => {
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

  it('does not let pipeline directly look up Channel or Mark registries', () => {
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
