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
  zh: '本模块各中版本的发布记录,按版本倒序;点击任一版本查看该版本各包的详细变更。',
  en: 'Release history for this module by minor version, newest first; click a version for that version’s detailed per-package changes.',
};

export const changelog: Array<Release> = [standardV01, kernelV05, kernelV04, kernelV03, vizV01, kernelV02, kernelV01];

/** 文档模块 id → changelog 包组 */
const MODULE_GROUP = new Map<string, 'kernel' | 'standard' | 'viz' | 'other'>([
  ['kernel', 'kernel'],
  ['standard', 'standard'],
  ['viz', 'viz'],
]);

/** 中版本号 → URL slug（`v0.3` → `v0-3`），概览页链接与详情页 subPage id 共用 */
export const changelogVersionSlug = (minor: string): string => minor.replaceAll('.', '-');

/** 包标识 → 所属包组 */
const groupOfPackage = (pkg: PackageId): 'kernel' | 'standard' | 'viz' | 'other' | undefined =>
  PACKAGE_GROUPS.find(group => group.members.includes(pkg))?.id;

/**
 * 按文档模块取 changelog 切片
 * @description 过滤每个里程碑的 packages 到该模块所属包组，丢弃过滤后无包块的里程碑；不修改入参。未知模块返回空数组。
 */
export const changelogForModule = (moduleId: string): Array<Release> => {
  const group = MODULE_GROUP.get(moduleId);
  if (!group) return [];
  return changelog
    .map(release => ({ ...release, packages: release.packages.filter(block => groupOfPackage(block.pkg) === group) }))
    .filter(release => release.packages.length > 0);
};
