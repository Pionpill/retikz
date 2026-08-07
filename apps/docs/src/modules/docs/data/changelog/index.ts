import type { Localized, PackageId, Release } from '../types';

import { PACKAGE_GROUPS } from '../types';
import { kernelV01 } from './kernel-0-1';
import { kernelV02 } from './kernel-0-2';
import { kernelV03 } from './kernel-0-3';
import { kernelV04 } from './kernel-0-4';
import { kernelV05 } from './kernel-0-5';
import { standardV01 } from './standard-0-1';
import { vizV01 } from './viz-0-1';
import { vizV02 } from './viz-0-2';

/** changelog 概览页副标题(替代原 mdx frontmatter description) */
export const changelogPageDescription: Localized = {
  zh: '当前分组各中版本的发布记录，按版本倒序；点击任一版本查看该版本各包的详细变更。',
  en: 'Release history for this documentation group by minor version, newest first; click a version for detailed per-package changes.',
};

export const changelog: Array<Release> = [
  vizV02,
  standardV01,
  kernelV05,
  kernelV04,
  kernelV03,
  vizV01,
  kernelV02,
  kernelV01,
];

/** 文档模块 id → changelog 包组 */
const MODULE_GROUP = new Map<string, 'kernel' | 'standard' | 'viz' | 'other'>([
  ['kernel', 'kernel'],
  ['standard', 'standard'],
  ['viz', 'viz'],
]);

/** Data 分组更新日志包含的包 */
const DATA_PACKAGES = new Set<PackageId>(['@retikz/data']);

/** Table 分组更新日志包含的三个 lockstep 包 */
const TABLE_PACKAGES = new Set<PackageId>(['@retikz/table', '@retikz/table-react', '@retikz/table-vanilla']);

/** Plot 分组更新日志包含的三个 lockstep 包 */
const PLOT_PACKAGES = new Set<PackageId>(['@retikz/plot', '@retikz/plot-react', '@retikz/plot-vanilla']);

/** Viz 文档分区到更新日志包集合 */
const VIZ_SECTION_PACKAGES = new Map<string, ReadonlySet<PackageId>>([
  ['data', DATA_PACKAGES],
  ['table', TABLE_PACKAGES],
  ['plot', PLOT_PACKAGES],
]);

/** 中版本号 → URL slug（`v0.3` → `v0-3`），概览页链接与详情页 subPage id 共用 */
export const changelogVersionSlug = (minor: string): string => minor.replaceAll('.', '-');

/** 包标识 → 所属包组 */
const groupOfPackage = (pkg: PackageId): 'kernel' | 'standard' | 'viz' | 'other' | undefined =>
  PACKAGE_GROUPS.find(group => group.members.includes(pkg))?.id;

/**
 * 计算过滤后包集合的 stable 发布日
 * @description 所有包组日期一致时返回该日期；混合已发布与开发中状态时返回 null
 */
const stableDateForPackages = (release: Release, packages: Array<Release['packages'][number]>): string | null => {
  const dates = new Set(packages.map(block => block.stableDate ?? release.stableDate));
  const [stableDate] = dates;
  return dates.size === 1 ? (stableDate ?? null) : null;
};

/**
 * 按文档模块与可选分组取 changelog 切片
 * @description Viz 的 Data / Table / Plot 分区分别只返回所属包；其余位置按模块包组过滤。过滤后无包块的里程碑会被丢弃，入参不会被修改
 */
export const changelogForModule = (moduleId: string, sectionId?: string): Array<Release> => {
  const group = MODULE_GROUP.get(moduleId);
  if (!group) return [];
  const vizSectionPackages = moduleId === 'viz' && sectionId ? VIZ_SECTION_PACKAGES.get(sectionId) : undefined;
  if (moduleId === 'viz' && sectionId && !vizSectionPackages) return [];
  return changelog
    .map(release => {
      const packages = release.packages.filter(block => {
        if (vizSectionPackages) return vizSectionPackages.has(block.pkg);
        return groupOfPackage(block.pkg) === group;
      });
      return {
        ...release,
        stableDate: stableDateForPackages(release, packages),
        packages,
      };
    })
    .filter(release => release.packages.length > 0);
};
