import { useLocation } from 'react-router';

import { DOC_ABOUT_ID, getSectionsByArea, isDocModuleId } from '@/modules/docs/data';

import type { DocLocation } from './types';

/** React Router 提供的原始文档路径参数 */
export type DocRouteParams = {
  moduleId?: string;
  sectionId?: string;
  pageId?: string;
  subPageId?: string;
  firstSeg?: string;
};

/** 从 pathname 提取文档路由参数，供桌面布局与 Header 共用。 */
export const parseDocRoutePathname = (pathname: string): DocRouteParams => {
  const segments = pathname.split('/').filter(Boolean);
  const [moduleId, first, second, third] = segments;
  if (!moduleId) return {};
  if (segments.length === 1) return { moduleId };
  if (segments.length === 2) return { moduleId, firstSeg: first };
  if (segments.length === 3) return { moduleId, sectionId: first, pageId: second };
  return { moduleId, sectionId: first, pageId: second, subPageId: third };
};

/**
 * 将路由段归一化为文档树位置
 * @description 三段 URL 既可能表示 grouped section/page，也可能表示 ungrouped page/subPage，需结合模块导航树消除歧义
 */
export const resolveDocLocation = (params: DocRouteParams): DocLocation | null => {
  const { moduleId, sectionId, pageId, subPageId, firstSeg } = params;
  if (!moduleId || (!isDocModuleId(moduleId) && moduleId !== DOC_ABOUT_ID)) return null;
  const sections = getSectionsByArea(moduleId);
  if (firstSeg) {
    const groupedSection = sections.find(section => section.label && section.id === firstSeg);
    if (groupedSection) return { moduleId, sectionId: firstSeg, pageId: null };
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
  const { pathname } = useLocation();
  return resolveDocLocation(parseDocRoutePathname(pathname));
};
