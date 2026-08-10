import type { Section } from './types';

import { DocDifficulty } from './types';

/** Diagram 图式元素与后续图结构能力的文档导航 */
export const diagramSection: Array<Section> = [
  {
    pages: [{ id: 'introduction', label: 'diagram.introduction', difficulty: DocDifficulty.Beginner }],
  },
  {
    id: 'notation',
    label: 'diagram.notation',
    document: true,
    pages: [
      {
        id: 'unit',
        label: 'diagram.baseUnits',
        children: [
          { id: 'semantic-units', label: 'diagram.semanticUnits', difficulty: DocDifficulty.Beginner },
          { id: 'connector', label: 'diagram.connector', difficulty: DocDifficulty.Advanced },
        ],
      },
      {
        id: 'frame',
        label: 'diagram.frameUnits',
        children: [{ id: 'logic-frame', label: 'diagram.logicFrame', difficulty: DocDifficulty.Advanced }],
      },
      { id: 'api-reference', label: 'diagram.notationApiReference' },
    ],
  },
  {
    id: 'releases',
    label: 'diagram.releases',
    pages: [
      {
        id: 'changelog',
        label: 'diagram.changelog',
        children: [{ id: 'v0-1', label: 'diagram.changelogV01' }],
      },
    ],
  },
];
