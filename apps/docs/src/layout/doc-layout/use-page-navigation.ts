import type { I18nKey, Page, Section, SubPage } from '@/data/interface';
import { getSectionsByModule } from '@/data/sections';
import { useMemo } from 'react';
import { docPathSegments, useDocLocation } from './doc-location';

export type LeafNode = {
  /** 路由 :sectionId 段；ungrouped 时为 null */
  sectionId: string | null;
  /** 路由 :pageId 段 */
  pageId: string;
  /** 路由 :subPageId 段（可选） */
  subPageId?: string;
  /** 节点 i18n label key */
  label: I18nKey;
  /** 完整路径，含 moduleId 前缀；无分组时不出现 sectionId 段 */
  path: string;
};

const buildPath = (moduleId: string, sectionId: string | null, pageId: string, subPageId?: string): string =>
  '/' + docPathSegments({ moduleId, sectionId, pageId, subPageId }).join('/');

/** 把一个 SubPage 节点（叶子或带 children 的分组）拍平成所有叶子 */
const collectFromSubPage = (
  moduleId: string,
  sectionId: string | null,
  pageId: string,
  sub: SubPage,
  acc: Array<LeafNode>,
): void => {
  if (sub.children) {
    for (const child of sub.children) {
      collectFromSubPage(moduleId, sectionId, pageId, child, acc);
    }
    return;
  }
  acc.push({
    sectionId,
    pageId,
    subPageId: sub.id,
    label: sub.label,
    path: buildPath(moduleId, sectionId, pageId, sub.id),
  });
};

/** 把一个 Page（一级页，可能有 children）拍平 */
const collectFromPage = (
  moduleId: string,
  sectionId: string | null,
  page: Page,
  acc: Array<LeafNode>,
): void => {
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
    path: buildPath(moduleId, sectionId, page.id),
  });
};

/** 跨 sections 拍平所有叶子节点，按 sidebar 上的展示顺序 */
export const flattenLeaves = (moduleId: string, sections: Array<Section>): Array<LeafNode> => {
  const acc: Array<LeafNode> = [];
  for (const section of sections) {
    const sectionId = section.label ? section.id ?? null : null;
    for (const page of section.pages) {
      collectFromPage(moduleId, sectionId, page, acc);
    }
  }
  return acc;
};

export type PageNavigation = {
  /** 上一篇，到头返回 null */
  prev: LeafNode | null;
  /** 下一篇，到尾返回 null */
  next: LeafNode | null;
};

/**
 * 基于当前路由参数，按 sidebar 顺序计算上 / 下一篇
 * @description 数据源由 getSectionsByModule 按 moduleId 派发，跨模块独立成环
 */
export const usePageNavigation = (): PageNavigation => {
  const loc = useDocLocation();

  return useMemo(() => {
    if (!loc) return { prev: null, next: null };
    const leaves = flattenLeaves(loc.moduleId, getSectionsByModule(loc.moduleId));
    const idx = leaves.findIndex(
      l => l.sectionId === loc.sectionId && l.pageId === loc.pageId && l.subPageId === loc.subPageId,
    );
    if (idx < 0) return { prev: null, next: null };
    return {
      prev: idx > 0 ? leaves[idx - 1] : null,
      next: idx < leaves.length - 1 ? leaves[idx + 1] : null,
    };
  }, [loc]);
};
