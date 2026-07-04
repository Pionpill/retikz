import { useMemo } from 'react';

import { getSectionsByModule } from '@/modules/docs/data';

import type { LeafNode } from './navigation-model';

import { useDocLocation } from './doc-location';
import { flattenLeaves } from './navigation-model';

export type PageNavigation = {
  /** 上一篇，到头返回 null。 */
  prev: LeafNode | null;
  /** 下一篇，到尾返回 null。 */
  next: LeafNode | null;
};

/** 基于当前路由参数，按 sidebar 顺序计算上 / 下一篇。 */
export const usePageNavigation = (): PageNavigation => {
  const loc = useDocLocation();

  return useMemo(() => {
    if (!loc) return { prev: null, next: null };
    const leaves = flattenLeaves(loc.moduleId, getSectionsByModule(loc.moduleId));
    const idx = leaves.findIndex(
      leaf => leaf.sectionId === loc.sectionId && leaf.pageId === loc.pageId && leaf.subPageId === loc.subPageId,
    );
    if (idx < 0) return { prev: null, next: null };
    return {
      prev: idx > 0 ? leaves[idx - 1] : null,
      next: idx < leaves.length - 1 ? leaves[idx + 1] : null,
    };
  }, [loc]);
};
