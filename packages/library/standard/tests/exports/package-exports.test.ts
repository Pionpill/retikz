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
  it('keeps Standard root-only after Layout ownership moves', () => {
    expect(Object.keys(standardManifest.exports)).toEqual(['.']);
    expect(Object.keys(standardManifest.publishConfig.exports)).toEqual(['.']);
  });

  it('keeps Standard adapters root-only after Layout ownership moves', () => {
    for (const manifest of adapterManifests) {
      expect(Object.keys(manifest.exports)).toEqual(['.']);
      expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.']);
    }
  });
});
