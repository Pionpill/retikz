import { useParams } from 'react-router';

import { getSectionsByModule } from '@/modules/docs/data';

import type { DocLocation } from './types';

/** 从 react-router 参数归一化当前文档页位置。 */
export const useDocLocation = (): DocLocation | null => {
  const { moduleId, sectionId, pageId, subPageId, firstSeg } = useParams<
    'moduleId' | 'sectionId' | 'pageId' | 'subPageId' | 'firstSeg'
  >();
  if (!moduleId) return null;
  if (firstSeg) {
    const sections = getSectionsByModule(moduleId);
    const documentedSection = sections.find(section => section.document && section.id === firstSeg);
    if (documentedSection) return { moduleId, sectionId: firstSeg, pageId: null };
    return { moduleId, sectionId: null, pageId: firstSeg };
  }
  if (sectionId && pageId) return { moduleId, sectionId, pageId, subPageId };
  return null;
};
