import type { DocDifficultyValue, Section, SubPage } from '@/modules/docs/data';

import { isDocDifficultyVisible } from '@/modules/docs/data';

const filterSubPage = (page: SubPage, maximum: DocDifficultyValue): SubPage | null => {
  if (!page.children) {
    return isDocDifficultyVisible(page.difficulty, maximum) ? { ...page } : null;
  }

  const children = page.children.flatMap(child => {
    const filtered = filterSubPage(child, maximum);
    return filtered ? [filtered] : [];
  });

  return children.length > 0 ? { ...page, children } : null;
};

/** 按最高阅读难度递归过滤文档树，并移除没有可见叶子的分组。 */
export const filterSectionsByDifficulty = (sections: Array<Section>, maximum: DocDifficultyValue): Array<Section> =>
  sections.flatMap(section => {
    const pages = section.pages.flatMap(page => {
      const filtered = filterSubPage(page, maximum);
      return filtered ? [filtered] : [];
    });

    return pages.length > 0 ? [{ ...section, pages }] : [];
  });
