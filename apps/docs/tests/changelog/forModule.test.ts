import { describe, expect, it } from 'vitest';
import { changelogForModule, changelogVersionSlug } from '@/data/changelog';
import { PACKAGE_GROUPS, type PackageId } from '@/data/changelog.types';

const membersOf = (id: 'core' | 'plot' | 'other'): Set<PackageId> =>
  new Set(PACKAGE_GROUPS.find(g => g.id === id)?.members ?? []);

describe('changelogForModule', () => {
  it('core 模块只含 core 组包', () => {
    const releases = changelogForModule('core');
    expect(releases.length).toBeGreaterThan(0);
    const core = membersOf('core');
    for (const r of releases) for (const b of r.packages) expect(core.has(b.pkg), b.pkg).toBe(true);
  });

  it('plot 模块只含 plot 组包', () => {
    const releases = changelogForModule('plot');
    expect(releases.length).toBeGreaterThan(0);
    const plot = membersOf('plot');
    for (const r of releases) for (const b of r.packages) expect(plot.has(b.pkg), b.pkg).toBe(true);
  });

  it('过滤后无包块的里程碑被丢弃（每个里程碑至少一个包）', () => {
    for (const moduleId of ['core', 'plot']) {
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
    for (const moduleId of ['core', 'plot']) {
      const slugs = changelogForModule(moduleId).map(r => changelogVersionSlug(r.minor));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
