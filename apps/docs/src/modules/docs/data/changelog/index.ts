import type { Localized, PackageId, Release } from '../types';

import { PACKAGE_GROUPS } from '../types';
import { kernelV01 } from './kernel-0-1';
import { kernelV02 } from './kernel-0-2';
import { kernelV03 } from './kernel-0-3';
import { kernelV04 } from './kernel-0-4';
import { kernelV05 } from './kernel-0-5';
import { standardV01 } from './standard-0-1';
import { vizV01 } from './viz-0-1';

/** changelog 概览页副标题(替代原 mdx frontmatter description) */
export const changelogPageDescription: Localized = {
  zh: '当前分组各中版本的发布记录，按版本倒序；点击任一版本查看该版本各包的详细变更。',
  en: 'Release history for this documentation group by minor version, newest first; click a version for detailed per-package changes.',
};

export const changelog: Array<Release> = [standardV01, kernelV05, kernelV04, kernelV03, vizV01, kernelV02, kernelV01];

/** 文档模块 id → changelog 包组 */
const MODULE_GROUP = new Map<string, 'kernel' | 'standard' | 'viz' | 'other'>([
  ['kernel', 'kernel'],
  ['standard', 'standard'],
  ['viz', 'viz'],
]);

/** 已迁移到 Plot 分组更新日志的三个 lockstep 包。 */
const PLOT_PACKAGES = new Set<PackageId>(['@retikz/plot', '@retikz/plot-react', '@retikz/plot-vanilla']);

/** 中版本号 → URL slug（`v0.3` → `v0-3`），概览页链接与详情页 subPage id 共用 */
export const changelogVersionSlug = (minor: string): string => minor.replaceAll('.', '-');

/** 包标识 → 所属包组 */
const groupOfPackage = (pkg: PackageId): 'kernel' | 'standard' | 'viz' | 'other' | undefined =>
  PACKAGE_GROUPS.find(group => group.members.includes(pkg))?.id;

/**
 * 按文档模块与可选分组取 changelog 切片
 * @description Plot 分组只返回三个 Plot 包；Viz 发布分组排除已迁移的 Plot 包；其余位置按模块包组过滤。过滤后无包块的里程碑会被丢弃，入参不会被修改
 */
export const changelogForModule = (moduleId: string, sectionId?: string): Array<Release> => {
  const group = MODULE_GROUP.get(moduleId);
  if (!group) return [];
  return changelog
    .map(release => ({
      ...release,
      packages: release.packages.filter(block => {
        if (moduleId === 'viz' && sectionId === 'plot') return PLOT_PACKAGES.has(block.pkg);
        if (moduleId === 'viz' && sectionId === 'releases') {
          return groupOfPackage(block.pkg) === group && !PLOT_PACKAGES.has(block.pkg);
        }
        return groupOfPackage(block.pkg) === group;
      }),
    }))
    .filter(release => release.packages.length > 0);
};
