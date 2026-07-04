import { useMemo } from 'react';

import type { Page, Section, SubPage } from '@/modules/docs/data';

import { getSectionsByModule } from '@/modules/docs/data';

import type { DocLocation } from './doc-location';

/** 当前文档路由命中的 data 节点。 */
export type DocPageNode = {
  sections: Array<Section>;
  section?: Section;
  page?: Page;
  subPage?: SubPage;
  target?: Page | SubPage;
};

/** 从文档路由位置解析当前 section / page / target。 */
export const resolveDocPageNode = (loc: DocLocation | null): DocPageNode => {
  if (!loc) return { sections: [] };
  const sections = getSectionsByModule(loc.moduleId);
  const section = loc.sectionId
    ? sections.find(item => item.id === loc.sectionId)
    : sections.find(item => !item.label);
  const page = section?.pages.find(item => item.id === loc.pageId);
  const subPage = loc.subPageId ? page?.children?.find(item => item.id === loc.subPageId) : undefined;
  return { sections, section, page, subPage, target: loc.subPageId ? subPage : page };
};

/** 解析当前文档路由命中的 data 节点。 */
export const useDocPageNode = (loc: DocLocation | null): DocPageNode => useMemo(() => resolveDocPageNode(loc), [loc]);
