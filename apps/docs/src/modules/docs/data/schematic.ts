import type { Section } from './types';

import { DocDifficulty } from './types';

/** Schematic 图式元素与后续图结构能力的文档导航 */
export const schematicSection: Array<Section> = [
  {
    pages: [{ id: 'introduction', label: 'schematic.introduction', difficulty: DocDifficulty.Beginner }],
  },
  {
    id: 'graph',
    label: 'schematic.graph',
    document: true,
    pages: [
      {
        id: 'base',
        label: 'schematic.baseUnits',
        children: [
          { id: 'code', label: 'schematic.entity', difficulty: DocDifficulty.Beginner },
          { id: 'connector', label: 'schematic.relation', difficulty: DocDifficulty.Beginner },
        ],
      },
      {
        id: 'frame',
        label: 'schematic.frameUnits',
        children: [{ id: 'graph-frame', label: 'schematic.container', difficulty: DocDifficulty.Advanced }],
      },
      { id: 'api-reference', label: 'schematic.graphApiReference' },
    ],
  },
  {
    id: 'releases',
    label: 'schematic.releases',
    pages: [
      {
        id: 'changelog',
        label: 'schematic.changelog',
        children: [{ id: 'v0-1', label: 'schematic.changelogV01' }],
      },
    ],
  },
];
