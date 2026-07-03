import { describe, expect, it } from 'vitest';

import type { PackageId } from '@/modules/docs/data/changelog.types';

import { changelogForModule, changelogVersionSlug } from '@/modules/docs/data/changelog';
import { PACKAGE_GROUPS } from '@/modules/docs/data/changelog.types';

const membersOf = (id: 'kernel' | 'viz' | 'other'): Set<PackageId> =>
  new Set(PACKAGE_GROUPS.find(g => g.id === id)?.members ?? []);

describe('changelogForModule', () => {
  it('core 模块只含 core 组包', () => {
    const releases = changelogForModule('kernel');
    expect(releases.length).toBeGreaterThan(0);
    const core = membersOf('kernel');
    for (const r of releases) for (const b of r.packages) expect(core.has(b.pkg), b.pkg).toBe(true);
  });

  it('viz 模块只含 viz 组包', () => {
    const releases = changelogForModule('viz');
    expect(releases.length).toBeGreaterThan(0);
    const plot = membersOf('viz');
    for (const r of releases) for (const b of r.packages) expect(plot.has(b.pkg), b.pkg).toBe(true);
  });

  it('过滤后无包块的里程碑被丢弃（每个里程碑至少一个包）', () => {
    for (const moduleId of ['kernel', 'viz']) {
      for (const r of changelogForModule(moduleId)) expect(r.packages.length).toBeGreaterThan(0);
    }
  });

  it('about（站点更新已下线）与未知模块返回空数组', () => {
    expect(changelogForModule('about')).toEqual([]);
    expect(changelogForModule('blog')).toEqual([]);
  });
});

describe('changelogVersionSlug', () => {
  it('点号转连字符', () => {
    expect(changelogVersionSlug('v0.3')).toBe('v0-3');
  });

  it('每个模块内各中版本 slug 唯一（保证侧边栏子页 id 不撞）', () => {
    for (const moduleId of ['kernel', 'viz']) {
      const slugs = changelogForModule(moduleId).map(r => changelogVersionSlug(r.minor));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
