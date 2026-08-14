import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import * as root from '../../src';
import * as clip from '../../src/clip';
import * as shape from '../../src/shape';

type PackageManifest = {
  exports: Record<string, { types: string; default: string }>;
  publishConfig: {
    exports: Record<string, { types: string; import: string; default: string }>;
  };
};

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as PackageManifest;

describe('Standard provider subpath exports', () => {
  it('keeps optional providers out of the root entry and makes each capability entry explicit', () => {
    for (const name of ['CrossShapeDefinition', 'CompoundClipDefinition']) {
      expect(root).not.toHaveProperty(name);
    }
    expect(shape.CrossShapeDefinition).toBeDefined();
    expect(clip.CompoundClipDefinition).toBeDefined();
  });

  it('declares the three Standard provider subpaths without a premature ribbon entry', () => {
    const entries = ['.', './shape', './arrow', './clip'];
    expect(Object.keys(manifest.exports)).toEqual(entries);
    expect(Object.keys(manifest.publishConfig.exports)).toEqual(entries);
    expect(manifest.exports['./shape']).toEqual({ types: './src/shape/index.ts', default: './src/shape/index.ts' });
    expect(manifest.exports['./arrow']).toEqual({ types: './src/arrow/index.ts', default: './src/arrow/index.ts' });
    expect(manifest.exports['./clip']).toEqual({ types: './src/clip/index.ts', default: './src/clip/index.ts' });
    expect(manifest.exports).not.toHaveProperty('./ribbon');
  });
});
