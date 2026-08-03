import { describe, expect, it } from 'vitest';

import type { PackageId } from '@/modules/docs/data';

import { changelogForModule, changelogVersionSlug, PACKAGE_GROUPS } from '@/modules/docs/data';

const membersOf = (id: 'kernel' | 'standard' | 'viz' | 'other'): Set<PackageId> =>
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

  it('Plot 更新日志只含三个 Plot 包', () => {
    const releases = changelogForModule('viz', 'plot');
    expect(releases).toHaveLength(1);
    expect(releases[0]?.packages.map(block => block.pkg)).toEqual([
      '@retikz/plot',
      '@retikz/plot-react',
      '@retikz/plot-vanilla',
    ]);
  });

  it('Data 更新日志只含 Data 包', () => {
    const releases = changelogForModule('viz', 'data');
    expect(releases).toHaveLength(1);
    expect(releases[0]?.packages.map(block => block.pkg)).toEqual(['@retikz/data']);
  });

  it('Table 更新日志只含三个 Table 包', () => {
    const releases = changelogForModule('viz', 'table');
    expect(releases).toHaveLength(1);
    expect(releases[0]?.packages.map(block => block.pkg)).toEqual([
      '@retikz/table',
      '@retikz/table-react',
      '@retikz/table-vanilla',
    ]);
  });

  it('Viz 分区按各发布组日期展示 stable 状态', () => {
    expect(changelogForModule('viz', 'data')[0]?.stableDate).toBe('2026-08-03');
    expect(changelogForModule('viz', 'plot')[0]?.stableDate).toBe('2026-08-03');
    expect(changelogForModule('viz', 'table')[0]?.stableDate).toBeNull();
    expect(changelogForModule('viz')[0]?.stableDate).toBeNull();
  });

  it('旧 Viz 发布分区不再返回更新日志', () => {
    expect(changelogForModule('viz', 'releases')).toEqual([]);
  });

  it('standard 模块只含 standard 组包', () => {
    const releases = changelogForModule('standard');
    expect(releases.length).toBeGreaterThan(0);
    const standard = membersOf('standard');
    for (const r of releases) for (const b of r.packages) expect(standard.has(b.pkg), b.pkg).toBe(true);
  });

  it('过滤后无包块的里程碑被丢弃（每个里程碑至少一个包）', () => {
    for (const moduleId of ['kernel', 'standard', 'viz']) {
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
    for (const moduleId of ['kernel', 'standard', 'viz']) {
      const slugs = changelogForModule(moduleId).map(r => changelogVersionSlug(r.minor));
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });
});
