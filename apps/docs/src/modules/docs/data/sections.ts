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

/** 按顶栏导航顺序返回 area 下的分组。 */
export const getNavigationSectionsByArea = (areaId: string | undefined): Array<Section> =>
  getSectionsByArea(areaId)
    .map((section, index) => ({ section, order: section.navigationOrder ?? index }))
    .sort((left, right) => left.order - right.order)
    .map(({ section }) => section);
