import { describe, expect, it } from 'vitest';
import type { Release } from '@/data/changelog.types';
import { allPackageIds, filterReleases } from '@/components/shared/changelog/filter';

const fixture: Array<Release> = [
  {
    minor: 'v0.2',
    stableDate: null,
    packages: [
      { pkg: '@retikz/core', version: 'v0.2', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
      { pkg: 'docs', version: 'v0.2', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
    ],
  },
  {
    minor: 'v0.0',
    stableDate: '2025-04-30',
    packages: [
      { pkg: 'retikz', version: 'v0.0', description: { zh: '', en: '' }, highlights: [], subVersions: [] },
    ],
  },
];

describe('allPackageIds', () => {
  it('按 PACKAGE_IDS 顺序返回数据中实际出现的包', () => {
    expect(allPackageIds(fixture)).toEqual(['@retikz/core', 'docs', 'retikz']);
  });
});

describe('filterReleases', () => {
  it('只保留选中包的块,并丢弃无可见块的里程碑', () => {
    const out = filterReleases(fixture, new Set(['@retikz/core']));
    expect(out).toHaveLength(1);
    expect(out[0]?.minor).toBe('v0.2');
    expect(out[0]?.packages.map(p => p.pkg)).toEqual(['@retikz/core']);
  });

  it('空选集返回空数组', () => {
    expect(filterReleases(fixture, new Set())).toEqual([]);
  });

  it('全选返回结构等价的全部里程碑', () => {
    const out = filterReleases(fixture, new Set(['@retikz/core', 'docs', 'retikz']));
    expect(out.map(r => r.minor)).toEqual(['v0.2', 'v0.0']);
  });
});
