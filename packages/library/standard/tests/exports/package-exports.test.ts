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

const manifests = [
  readManifest('../../package.json'),
  readManifest('../../../standard-react/package.json'),
  readManifest('../../../standard-vanilla/package.json'),
];

describe('Standard package exports', () => {
  it('keeps root and the controlled optional inspect subpath across the package family', () => {
    for (const manifest of manifests) {
      expect(Object.keys(manifest.exports)).toEqual(['.', './inspect']);
      expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.', './inspect']);
    }
  });
});
