import type { Section } from './interface';

import { aboutSection } from './about';
import { graphSection } from './graph';
import { kernelSection } from './kernel';

/** 按 :moduleId 查对应的 sections；未实装的模块返回空数组。 */
export const getSectionsByModule = (moduleId: string | undefined): Array<Section> => {
  switch (moduleId) {
    case 'kernel':
      return kernelSection;
    case 'graph':
      return graphSection;
    case 'about':
      return aboutSection;
    default:
      return [];
  }
};
