import type { Section } from './types';

/** Standard 可选 Tier 2 能力的文档导航 */
export const standardSection: Array<Section> = [
  {
    id: 'components',
    label: 'standard.components',
    document: true,
    pages: [
      { id: 'grid', label: 'standard.grid' },
      { id: 'axes', label: 'standard.axes' },
      { id: 'frame', label: 'standard.frame' },
    ],
  },
];
