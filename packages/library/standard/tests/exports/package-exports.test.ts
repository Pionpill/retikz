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

describe('Standard 包导出', () => {
  it('公开三个 Standard 组件系列', () => {
    const entries = ['.', './shape', './presentation', './collection'];

    expect(Object.keys(standardManifest.exports)).toEqual(entries);
    expect(Object.keys(standardManifest.publishConfig.exports)).toEqual(entries);
  });

  it('通过两个适配器公开相同的系列子路径', () => {
    for (const manifest of adapterManifests) {
      expect(Object.keys(manifest.exports)).toEqual(['.', './shape', './presentation', './collection']);
      expect(Object.keys(manifest.publishConfig.exports)).toEqual(['.', './shape', './presentation', './collection']);
    }
  });
});
