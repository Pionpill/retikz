import { useParams } from 'react-router';

import type { DocLocation } from './types';

/** 从 react-router 参数归一化当前文档页位置。 */
export const useDocLocation = (): DocLocation | null => {
  const { moduleId, sectionId, pageId, subPageId, firstSeg } = useParams<
    'moduleId' | 'sectionId' | 'pageId' | 'subPageId' | 'firstSeg'
  >();
  if (!moduleId) return null;
  if (firstSeg) return { moduleId, sectionId: null, pageId: firstSeg };
  if (sectionId && pageId) return { moduleId, sectionId, pageId, subPageId };
  return null;
};
