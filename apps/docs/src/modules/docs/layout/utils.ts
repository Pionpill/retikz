import type { TFunction } from 'i18next';
import type { LucideIcon } from 'lucide-react';

import { ChartScatter } from 'lucide-react';

import type { DocSidebarIcon, Page, Section, SubPage } from '@/modules/docs/data';

import type { SidebarCategoryData, SidebarSubModuleData } from './sidebar';
import type { DocLocation, LeafNode } from './types';

/** Viz 内拥有独立更新日志的分区 */
const VIZ_CHANGELOG_SECTIONS = new Set(['data', 'table', 'plot']);

/** 文档数据中的稳定图标 id 到 Lucide 组件的唯一映射 */
const DOC_SIDEBAR_ICONS: Record<DocSidebarIcon, LucideIcon> = {
  'chart-scatter': ChartScatter,
};

/** 是否为数据驱动渲染的 changelog 页面 */
export const isChangelogLocation = (loc: DocLocation | null): boolean =>
  loc?.pageId === 'changelog' &&
  (loc.moduleId === 'viz'
    ? loc.sectionId !== null && VIZ_CHANGELOG_SECTIONS.has(loc.sectionId)
    : loc.sectionId === 'releases');

/** location -> URL / 文件路径所需的 segment 数组。 */
export const docPathSegments = (loc: DocLocation): Array<string> => {
  const parts = [loc.moduleId];
  if (loc.sectionId) parts.push(loc.sectionId);
  if (loc.pageId !== null) parts.push(loc.pageId);
  if (loc.subPageId) parts.push(loc.subPageId);
  return parts;
};

/** 组装文档页 URL path。 */
export const buildDocPath = (
  moduleId: string,
  sectionId: string | null,
  pageId: string | null,
  subPageId?: string,
): string => '/' + docPathSegments({ moduleId, sectionId, pageId, subPageId }).join('/');

const collectFromSubPage = (
  moduleId: string,
  sectionId: string | null,
  pageId: string,
  subPage: SubPage,
  acc: Array<LeafNode>,
): void => {
  if (subPage.children) {
    for (const child of subPage.children) {
      collectFromSubPage(moduleId, sectionId, pageId, child, acc);
    }
    return;
  }

  acc.push({
    sectionId,
    pageId,
    subPageId: subPage.id,
    label: subPage.label,
    path: buildDocPath(moduleId, sectionId, pageId, subPage.id),
  });
};

const collectFromPage = (moduleId: string, sectionId: string | null, page: Page, acc: Array<LeafNode>): void => {
  if (page.children) {
    for (const child of page.children) {
      collectFromSubPage(moduleId, sectionId, page.id, child, acc);
    }
    return;
  }

  acc.push({
    sectionId,
    pageId: page.id,
    label: page.label,
    path: buildDocPath(moduleId, sectionId, page.id),
  });
};

/** 按 sidebar 展示顺序拍平 sections 中的所有叶子节点。 */
export const flattenLeaves = (moduleId: string, sections: Array<Section>): Array<LeafNode> => {
  const acc: Array<LeafNode> = [];
  for (const section of sections) {
    const sectionId = section.label ? (section.id ?? null) : null;
    if (section.document && section.id && section.label) {
      acc.push({
        sectionId: section.id,
        pageId: null,
        label: section.label,
        path: buildDocPath(moduleId, section.id, null),
      });
    }
    for (const page of section.pages) {
      collectFromPage(moduleId, sectionId, page, acc);
    }
  }
  return acc;
};

const mapSidebarChildren = (t: TFunction, children?: Array<SubPage>): Array<SidebarSubModuleData> | undefined =>
  children?.map(child => ({
    value: child.id,
    label: t(child.label),
    children: mapSidebarChildren(t, child.children),
  }));

/** 从 docs data 构建 sidebar 视图数据。 */
export const buildSidebarCategories = (
  t: TFunction,
  moduleId: string,
  sections: Array<Section>,
): Array<SidebarCategoryData> =>
  sections.map((section, index) => ({
    value: section.id ?? `__ungrouped_${index}`,
    label: section.label ? t(section.label) : undefined,
    path: section.document && section.id ? buildDocPath(moduleId, section.id, null) : undefined,
    ungrouped: !section.label,
    modules: section.pages.map(page => ({
      value: page.id,
      label: t(page.label),
      ...(page.icon === undefined ? {} : { Icon: DOC_SIDEBAR_ICONS[page.icon] }),
      children: mapSidebarChildren(t, page.children),
    })),
  }));
