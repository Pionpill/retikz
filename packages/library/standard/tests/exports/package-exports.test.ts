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
  it('exposes the controlled layout and inspect subpaths from Standard', () => {
    expect(Object.keys(standardManifest.exports)).toEqual(['.', './inspect', './layout']);
    expect(Object.keys(standardManifest.publishConfig.exports)).toEqual(['.', './inspect', './layout']);
  });

  it('keeps root and inspect subpaths across the adapter family', () => {
    for (const manifest of adapterManifests) {
      expect(Object.keys(manifest.exports)).toEqual(['.', './inspect']);
      expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.', './inspect']);
    }
  });
});
