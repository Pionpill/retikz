import type { Section } from './types';
import { DocDifficulty } from './types';

/** Schematic 图式元素与后续图结构能力的文档导航 */
export const schematicSection: Array<Section> = [
  {
    id: 'graph',
    label: 'schematic.graph',
    navigationDescription: 'schematic.graphNavigationDescription',
    pages: [
      {
        id: 'introduction',
        label: 'schematic.introduction',
        difficulty: DocDifficulty.Beginner,
        meta: { pageType: 'entry', audience: 'user', sourceOfTruth: 'runtime' },
      },
      {
        id: 'get-start',
        label: 'schematic.getStart',
        difficulty: DocDifficulty.Beginner,
        meta: { pageType: 'entry', audience: 'user', sourceOfTruth: 'runtime' },
      },
      {
        id: 'changelog',
        label: 'schematic.changelog',
        children: [{ id: 'v0-1', label: 'schematic.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'graph.release',
          sourceOfTruth: 'changelog',
        },
      },
      {
        id: 'entity',
        label: 'schematic.entity',
        sidebarGroup: 'schematic.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'runtime' },
        children: [
          { id: 'usage', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner },
          {
            id: 'custom',
            label: 'schematic.customUsage',
            difficulty: DocDifficulty.Advanced,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'graph.entity.registry',
              sourceOfTruth: 'runtime',
            },
          },
          {
            id: 'mechanism',
            label: 'schematic.mechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'architecture', audience: 'maintainer', sourceOfTruth: 'runtime' },
          },
          {
            id: 'api-reference',
            label: 'schematic.apiReference',
            meta: { pageType: 'reference', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'schematic.schemaReference',
            meta: { pageType: 'reference', audience: 'user', sourceOfTruth: 'schema' },
          },
        ],
      },
      {
        id: 'relation',
        label: 'schematic.relation',
        sidebarGroup: 'schematic.components',
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
        sidebarGroup: 'schematic.components',
        children: [
          { id: 'basic', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner },
          {
            id: 'extension',
            label: 'schematic.extensionUsage',
            difficulty: DocDifficulty.Advanced,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'graph.codeBlock',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'group',
        label: 'schematic.group',
        difficulty: DocDifficulty.Beginner,
        sidebarGroup: 'schematic.components',
      },
    ],
  },
  {
    id: 'diagram',
    label: 'schematic.diagram',
    navigationDescription: 'schematic.diagramNavigationDescription',
    document: true,
    pages: [
      { id: 'framework', label: 'schematic.diagramFramework' },
      {
        id: 'flow',
        label: 'schematic.flowDiagram',
        children: [{ id: 'basic', label: 'schematic.basicUsage', difficulty: DocDifficulty.Beginner }],
      },
      {
        id: 'changelog',
        label: 'schematic.changelog',
        children: [{ id: 'v0-1', label: 'schematic.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'diagram.release',
          sourceOfTruth: 'changelog',
        },
      },
    ],
  },
];
