import type { Section } from './types';

import { DocDifficulty } from './types';

/** Diagram 图式元素与后续图结构能力的文档导航 */
export const diagramSection: Array<Section> = [
  {
    pages: [{ id: 'introduction', label: 'diagram.introduction', difficulty: DocDifficulty.Beginner }],
  },
  {
    id: 'graph',
    label: 'diagram.graph',
    document: true,
    pages: [
      {
        id: 'unit',
        label: 'diagram.baseUnits',
        children: [
          { id: 'node', label: 'diagram.logicNode', difficulty: DocDifficulty.Beginner },
          { id: 'connector', label: 'diagram.graphConnector', difficulty: DocDifficulty.Beginner },
        ],
      },
      {
        id: 'frame',
        label: 'diagram.frameUnits',
        children: [{ id: 'graph-frame', label: 'diagram.graphFrame', difficulty: DocDifficulty.Advanced }],
      },
      { id: 'api-reference', label: 'diagram.graphApiReference' },
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
