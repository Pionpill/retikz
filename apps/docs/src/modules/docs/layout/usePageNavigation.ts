import { useMemo } from 'react';

import type { Section } from '@/modules/docs/data';

import { getSectionsByModule } from '@/modules/docs/data';
import { useDocDifficultyStore } from '@/modules/docs/store';

import type { DocLocation, LeafNode } from './types';

import { filterSectionsByDifficulty } from './filter-doc-sections';
import { useDocLocation } from './useDocLocation';
import { flattenLeaves } from './utils';

export type PageNavigation = {
  /** 上一篇，到头返回 null。 */
  prev: LeafNode | null;
  /** 下一篇，到尾返回 null。 */
  next: LeafNode | null;
};

/** 在给定可见文档树中解析当前页的上一篇与下一篇。 */
export const resolvePageNavigation = (loc: DocLocation | null, sections: Array<Section>): PageNavigation => {
  if (!loc) return { prev: null, next: null };
  const leaves = flattenLeaves(loc.moduleId, sections);
  const idx = leaves.findIndex(
    leaf => leaf.sectionId === loc.sectionId && leaf.pageId === loc.pageId && leaf.subPageId === loc.subPageId,
  );
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? leaves[idx - 1] : null,
    next: idx < leaves.length - 1 ? leaves[idx + 1] : null,
  };
};

/** 基于当前路由参数，按 sidebar 顺序计算上 / 下一篇。 */
export const usePageNavigation = (): PageNavigation => {
  const loc = useDocLocation();
  const maximumDifficulty = useDocDifficultyStore(state => state.maximumDifficulty);

  return useMemo(
    () =>
      resolvePageNavigation(
        loc,
        loc ? filterSectionsByDifficulty(getSectionsByModule(loc.moduleId), maximumDifficulty) : [],
      ),
    [loc, maximumDifficulty],
  );
};
