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
        id: 'entity',
        label: 'schematic.entity',
        children: [
          { id: 'basic', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner },
          {
            id: 'extension',
            label: 'schematic.extensionUsage',
            difficulty: DocDifficulty.Advanced,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'graph.entity.registry',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'relation',
        label: 'schematic.relation',
        children: [
          { id: 'basic', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner },
          {
            id: 'extension',
            label: 'schematic.extensionUsage',
            difficulty: DocDifficulty.Advanced,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'graph.relation.registry',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'block',
        label: 'schematic.block',
        children: [
          { id: 'basic', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner },
          { id: 'builtin', label: 'schematic.builtinImplementation', difficulty: DocDifficulty.Internals },
          { id: 'extension', label: 'schematic.extensionUsage', difficulty: DocDifficulty.Advanced },
        ],
      },
      { id: 'group', label: 'schematic.group', difficulty: DocDifficulty.Beginner },
      { id: 'api-reference', label: 'schematic.graphApiReference' },
    ],
  },
  {
    id: 'diagram',
    label: 'schematic.diagram',
    document: true,
    pages: [{ id: 'framework', label: 'schematic.diagramFramework' }],
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
