import type { Section } from './types';

import { aboutSection } from './about';
import { schematicSection } from './schematic';
import { kernelSection } from './kernel';
import { librarySection } from './library';
import { vizSection } from './viz';

/** 按 :moduleId 查对应的 sections；未实装的模块返回空数组。 */
export const getSectionsByModule = (moduleId: string | undefined): Array<Section> => {
  switch (moduleId) {
    case 'kernel':
      return kernelSection;
    case 'library':
      return librarySection;
    case 'schematic':
      return schematicSection;
    case 'viz':
      return vizSection;
    case 'about':
      return aboutSection;
    default:
      return [];
  }
};
