import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type PackageManifest = {
  exports: Record<string, unknown>;
  publishConfig: {
    exports: Record<string, unknown>;
  };
};

/** 读取当前测试覆盖的 package manifest */
const readManifest = (path: string): PackageManifest =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as PackageManifest;

const standardManifest = readManifest('../../package.json');
const adapterManifests = [
  readManifest('../../../standard-react/package.json'),
  readManifest('../../../standard-vanilla/package.json'),
];

describe('Standard package exports', () => {
  it('exposes presentation and shape composites', () => {
    const entries = ['.', './shape'];
    expect(Object.keys(standardManifest.exports)).toEqual(entries);
    expect(Object.keys(standardManifest.publishConfig.exports)).toEqual(entries);
  });

  it('exposes the shape family through dedicated adapter subpaths', () => {
    for (const manifest of adapterManifests) {
      expect(Object.keys(manifest.exports)).toEqual(['.', './shape']);
      expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.', './shape']);
    }
  });
});
