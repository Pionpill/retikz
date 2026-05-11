import { coreSection } from './core';
import { aboutSection } from './about';
import type { Section } from './interface';

/** 按 :moduleId 查对应的 sections；未实装的模块返回空数组。 */
export const getSectionsByModule = (moduleId: string | undefined): Array<Section> => {
  switch (moduleId) {
    case 'core':
      return coreSection;
    case 'about':
      return aboutSection;
    default:
      return [];
  }
};
