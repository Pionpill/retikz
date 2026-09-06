import type { Section } from './types';

import { aboutSection } from './about';
import { kernelSection } from './kernel';
import { librarySection } from './library';
import { schematicSection } from './schematic';
import { vizSection } from './viz';

/** 按 navigation area 查对应的 sections；未知 area 返回空数组。 */
export const getSectionsByArea = (areaId: string | undefined): Array<Section> => {
  switch (areaId) {
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
