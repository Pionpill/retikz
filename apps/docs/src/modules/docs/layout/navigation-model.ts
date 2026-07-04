import type { TFunction } from 'i18next';

import type { I18nKey, Page, Section, SubPage } from '@/modules/docs/data';

import type { SidebarCategoryData, SidebarSubModuleData } from './sidebar/types';

import { docPathSegments } from './doc-location';

/** 文档树中的可导航叶子页。 */
export type LeafNode = {
  /** 路由 :sectionId 段；ungrouped 时为 null。 */
  sectionId: string | null;
  /** 路由 :pageId 段。 */
  pageId: string;
  /** 路由 :subPageId 段。 */
  subPageId?: string;
  /** 节点 i18n label key。 */
  label: I18nKey;
  /** 完整路径，含 moduleId 前缀；无分组时不出现 sectionId 段。 */
  path: string;
};

/** 组装文档页 URL path。 */
export const buildDocPath = (moduleId: string, sectionId: string | null, pageId: string, subPageId?: string): string =>
  '/' + docPathSegments({ moduleId, sectionId, pageId, subPageId }).join('/');

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

/** 跨 sections 拍平所有叶子节点，按 sidebar 展示顺序输出。 */
export const flattenLeaves = (moduleId: string, sections: Array<Section>): Array<LeafNode> => {
  const acc: Array<LeafNode> = [];
  for (const section of sections) {
    const sectionId = section.label ? (section.id ?? null) : null;
    for (const page of section.pages) {
      collectFromPage(moduleId, sectionId, page, acc);
    }
  }
  return acc;
};

const mapSidebarChildren = (
  t: TFunction,
  children?: Array<SubPage>,
): Array<SidebarSubModuleData> | undefined =>
  children?.map(child => ({
    value: child.id,
    label: t(child.label),
    children: mapSidebarChildren(t, child.children),
  }));

/** 从 docs data 构建 sidebar 视图数据。 */
export const buildSidebarCategories = (t: TFunction, sections: Array<Section>): Array<SidebarCategoryData> =>
  sections.map((section, index) => ({
    value: section.id ?? `__ungrouped_${index}`,
    label: section.label ? t(section.label) : undefined,
    ungrouped: !section.label,
    modules: section.pages.map(page => ({
      value: page.id,
      label: t(page.label),
      children: mapSidebarChildren(t, page.children),
    })),
  }));
