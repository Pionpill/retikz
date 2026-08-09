import { useParams } from 'react-router';

import { getSectionsByModule } from '@/modules/docs/data';

import type { DocLocation } from './types';

/** React Router 提供的原始文档路径参数 */
export type DocRouteParams = {
  moduleId?: string;
  sectionId?: string;
  pageId?: string;
  subPageId?: string;
  firstSeg?: string;
};

/**
 * 将路由段归一化为文档树位置
 * @description 三段 URL 既可能表示 grouped section/page，也可能表示 ungrouped page/subPage，需结合模块导航树消除歧义
 */
export const resolveDocLocation = (params: DocRouteParams): DocLocation | null => {
  const { moduleId, sectionId, pageId, subPageId, firstSeg } = params;
  if (!moduleId) return null;
  const sections = getSectionsByModule(moduleId);
  if (firstSeg) {
    const documentedSection = sections.find(section => section.document && section.id === firstSeg);
    if (documentedSection) return { moduleId, sectionId: firstSeg, pageId: null };
    return { moduleId, sectionId: null, pageId: firstSeg };
  }
  if (sectionId && pageId) {
    const groupedSection = sections.find(section => section.label && section.id === sectionId);
    if (groupedSection) return { moduleId, sectionId, pageId, subPageId };

    const ungroupedSection = sections.find(section => !section.label);
    const ungroupedPage = ungroupedSection?.pages.find(page => page.id === sectionId);
    if (ungroupedPage?.children?.some(child => child.id === pageId)) {
      return { moduleId, sectionId: null, pageId: sectionId, subPageId: pageId };
    }

    return { moduleId, sectionId, pageId, subPageId };
  }
  return null;
};

/** 从 react-router 参数归一化当前文档页位置。 */
export const useDocLocation = (): DocLocation | null => {
  const params = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId' | 'firstSeg'>();
  return resolveDocLocation(params);
};
