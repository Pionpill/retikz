import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  changelog,
  changelogForModule,
  changelogVersionSlug,
  kernelSection,
  librarySection,
  PACKAGE_IDS,
  schematicSection,
  vizSection,
} from '@/modules/docs/data';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const Localized = z.object({ zh: z.string().min(1), en: z.string().min(1) });
const ChangeItem: z.ZodType = z.lazy(() =>
  z.object({ label: Localized, content: Localized, children: z.array(ChangeItem).optional() }),
);
const SubVersion = z.object({
  version: z.string().min(1),
  date: z.string().regex(DATE),
  summary: Localized.optional(),
  items: z.array(ChangeItem),
});
const PackageBlock = z.object({
  pkg: z.enum(PACKAGE_IDS),
  stableDate: z.string().regex(DATE).nullable().optional(),
  version: z.string().min(1),
  description: z.object({ zh: z.string().min(1).max(200), en: z.string().min(1).max(200) }),
  highlights: z.array(ChangeItem),
  subVersions: z.array(SubVersion),
});
const Release = z.object({
  minor: z.string().min(1),
  stableDate: z.string().regex(DATE).nullable(),
  packages: z.array(PackageBlock),
});

describe('changelog data', () => {
  it('符合 schema(含 description ≤200 / 合法 pkg / YYYY-MM-DD)', () => {
    expect(() => z.array(Release).parse(changelog)).not.toThrow();
  });

  it('里程碑非空', () => {
    expect(changelog.length).toBeGreaterThan(0);
  });

  it('Library 按 Standard 在上、Layout 在下注册独立分区', () => {
    expect(librarySection.map(section => section.id)).toEqual(['standard', 'layout']);
    expect(librarySection.every(section => section.document)).toBe(true);
  });

  it('当前 kernel 里程碑注册详情路由', () => {
    const releases = kernelSection.find(section => section.id === 'releases');
    const changelogPage = releases?.pages.find(page => page.id === 'changelog');
    const currentKernelRelease = changelogForModule('kernel')[0];
    expect(currentKernelRelease).toBeDefined();
    const currentReleaseId = changelogVersionSlug(currentKernelRelease.minor);

    expect(changelogPage?.children?.some(page => page.id === currentReleaseId)).toBe(true);
  });

  it('当前 standard 里程碑注册详情路由', () => {
    const standard = librarySection.find(section => section.id === 'standard');
    const changelogPage = standard?.pages.find(page => page.id === 'changelog');
    const currentStandardRelease = changelogForModule('library', 'standard')[0];
    expect(currentStandardRelease).toBeDefined();
    const currentReleaseId = changelogVersionSlug(currentStandardRelease.minor);

    expect(changelogPage?.children?.some(page => page.id === currentReleaseId)).toBe(true);
  });

  it('Standard alpha.2 更新日志覆盖三个发布包', () => {
    const release = changelogForModule('library', 'standard')[0];
    const packages = ['@retikz/standard', '@retikz/standard-vanilla', '@retikz/standard-react'];

    expect(release.packages.map(block => block.pkg)).toEqual(packages);
    for (const block of release.packages) {
      const alpha = block.subVersions.find(version => version.version === 'alpha.2');
      expect(alpha?.date).toBe('2026-07-30');
      expect(alpha?.summary?.zh).toBeTruthy();
      expect(alpha?.summary?.en).toBeTruthy();
      expect(alpha?.items.length).toBeGreaterThan(0);
    }
  });

  it('当前 Layout 里程碑注册详情路由并覆盖三个发布包', () => {
    const layout = librarySection.find(section => section.id === 'layout');
    const changelogPage = layout?.pages.find(page => page.id === 'changelog');
    const currentLayoutRelease = changelogForModule('library', 'layout')[0];
    expect(currentLayoutRelease).toBeDefined();
    expect(currentLayoutRelease.packages.map(block => block.pkg)).toEqual([
      '@retikz/layout',
      '@retikz/layout-vanilla',
      '@retikz/layout-react',
    ]);
    expect(changelogPage?.children?.some(page => page.id === changelogVersionSlug(currentLayoutRelease.minor))).toBe(
      true,
    );
  });

  it('当前 Schematic 里程碑注册详情路由并覆盖 Graph 包族', () => {
    const releases = schematicSection.find(section => section.id === 'releases');
    const changelogPage = releases?.pages.find(page => page.id === 'changelog');
    const currentRelease = changelogForModule('schematic')[0];
    expect(currentRelease).toBeDefined();
    expect(currentRelease.packages.map(block => block.pkg)).toEqual([
      '@retikz/graph',
      '@retikz/graph-react',
      '@retikz/graph-vanilla',
    ]);
    expect(changelogPage?.children?.some(page => page.id === changelogVersionSlug(currentRelease.minor))).toBe(true);
  });

  it.each(['data', 'chart', 'table', 'plot'] as const)('当前 Viz %s 分区注册独立更新日志详情路由', sectionId => {
    const section = vizSection.find(entry => entry.id === sectionId);
    const changelogPage = section?.pages.find(page => page.id === 'changelog');
    const currentRelease = changelogForModule('viz', sectionId)[0];
    expect(currentRelease).toBeDefined();
    const currentReleaseId = changelogVersionSlug(currentRelease.minor);

    expect(changelogPage?.children?.some(page => page.id === currentReleaseId)).toBe(true);
  });

  it('每个里程碑的 subVersions 日期倒序', () => {
    for (const release of changelog) {
      for (const block of release.packages) {
        const dates = block.subVersions.map(s => s.date);
        const sorted = [...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
        expect(dates, `${release.minor} ${block.pkg}`).toEqual(sorted);
      }
    }
  });
});
