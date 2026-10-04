import type { Section } from './types';

/** Library 能力包的文档导航 */
export const librarySection: Array<Section> = [
  {
    id: 'standard',
    label: 'library.standard',
    navigationDescription: 'library.standardNavigationDescription',
    document: true,
    pages: [
      {
        id: 'introduction',
        label: 'library.standardIntroduction',
        difficulty: 'beginner',
      },
      {
        id: 'get-start',
        label: 'library.getStart',
        difficulty: 'beginner',
      },
      {
        id: 'design',
        label: 'library.design',
        difficulty: 'beginner',
        meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
      },
      {
        id: 'changelog',
        label: 'library.changelog',
        children: [
          {
            id: 'v0-1',
            label: 'library.changelogV01',
          },
        ],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'standard.release',
          sourceOfTruth: 'changelog',
        },
      },
      {
        id: 'shape',
        label: 'library.standardShapes',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          {
            id: 'circle-ellipse',
            label: 'library.standardCircleEllipse',
            difficulty: 'beginner',
          },
          {
            id: 'rectangle',
            label: 'library.standardRectangle',
            difficulty: 'beginner',
          },
          {
            id: 'polygon',
            label: 'library.standardPolygon',
            difficulty: 'beginner',
          },
          {
            id: 'star',
            label: 'library.standardStar',
            difficulty: 'beginner',
          },
          {
            id: 'arc-sector',
            label: 'library.standardArcSector',
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'collection',
        label: 'library.standardCollections',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          {
            id: 'array',
            label: 'library.standardArray',
            difficulty: 'beginner',
          },
          {
            id: 'map',
            label: 'library.standardMap',
            difficulty: 'beginner',
          },
        ],
      },
      {
        id: 'presentation',
        label: 'library.standardPresentation',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          {
            id: 'grid',
            label: 'library.standardGrid',
            difficulty: 'beginner',
          },
          {
            id: 'axes',
            label: 'library.standardAxes',
            difficulty: 'beginner',
          },
          {
            id: 'frame',
            label: 'library.standardFrame',
            difficulty: 'beginner',
          },
          {
            id: 'surface',
            label: 'library.standardSurface',
            difficulty: 'beginner',
          },
          {
            id: 'legend',
            label: 'library.standardLegend',
            difficulty: 'beginner',
          },
        ],
      },
    ],
  },
  {
    id: 'extension',
    label: 'library.extension',
    navigationDescription: 'library.extensionNavigationDescription',
    document: true,
    pages: [
      { id: 'introduction', label: 'library.introduction', difficulty: 'beginner' },
      { id: 'get-start', label: 'library.getStart', difficulty: 'beginner' },
      {
        id: 'design',
        label: 'library.design',
        difficulty: 'beginner',
        meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
      },
      {
        id: 'changelog',
        label: 'library.changelog',
        children: [{ id: 'v0-1', label: 'library.changelogV01' }],
        meta: { pageType: 'release', audience: 'user', capability: 'extension.release', sourceOfTruth: 'changelog' },
      },
      {
        id: 'shape',
        label: 'library.extensionShape',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'extension.shape',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.components',
      },
      {
        id: 'arrow',
        label: 'library.extensionArrow',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'extension.arrow',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.components',
      },
      {
        id: 'clip',
        label: 'library.extensionClip',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'extension.clip',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.components',
      },
      {
        id: 'ribbon',
        label: 'library.extensionRibbon',
        sidebarGroup: 'library.components',
        meta: {
          pageType: 'group',
          audience: 'user',
          capability: 'extension.ribbon',
          sourceOfTruth: 'docs',
        },
        children: [
          { id: 'usage', label: 'library.extensionRibbonBasicUsage', difficulty: 'beginner' },
          { id: 'extended', label: 'library.extensionRibbonExtendedUsage', difficulty: 'beginner' },
          {
            id: 'custom',
            label: 'library.extensionRibbonCustomUsage',
            difficulty: 'advanced',
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'extension.ribbon.width-profile',
              sourceOfTruth: 'runtime',
            },
          },
          { id: 'mechanism', label: 'schematic.mechanism', difficulty: 'internals' },
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
        id: 'animation',
        label: 'library.extensionAnimation',
        difficulty: 'beginner',
        sidebarGroup: 'library.visual',
        meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
      },
    ],
  },
  {
    id: 'layout',
    label: 'library.layout',
    navigationDescription: 'library.layoutNavigationDescription',
    pages: [
      {
        id: 'introduction',
        label: 'library.introduction',
        difficulty: 'beginner',
      },
      {
        id: 'get-start',
        label: 'library.getStart',
        difficulty: 'beginner',
      },
      {
        id: 'design',
        label: 'library.design',
        difficulty: 'beginner',
        meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
      },
      {
        id: 'changelog',
        label: 'library.changelog',
        children: [
          {
            id: 'v0-1',
            label: 'library.changelogV01',
          },
        ],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'layout.release',
          sourceOfTruth: 'changelog',
        },
      },
      {
        id: 'flex-layout',
        label: 'library.flexLayout',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          { id: 'usage', label: 'schematic.basicUsage', difficulty: 'beginner' },
          { id: 'extended', label: 'schematic.extensionUsage', difficulty: 'advanced' },
          { id: 'mechanism', label: 'schematic.mechanism', difficulty: 'internals' },
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
        id: 'grid-layout',
        label: 'library.gridLayout',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          { id: 'usage', label: 'schematic.basicUsage', difficulty: 'beginner' },
          { id: 'extended', label: 'schematic.extensionUsage', difficulty: 'advanced' },
          { id: 'mechanism', label: 'schematic.mechanism', difficulty: 'internals' },
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
        id: 'overlay-layout',
        label: 'library.overlayLayout',
        sidebarGroup: 'library.components',
        meta: { pageType: 'group', audience: 'user', sourceOfTruth: 'docs' },
        children: [
          { id: 'usage', label: 'schematic.basicUsage', difficulty: 'beginner' },
          { id: 'extended', label: 'schematic.extensionUsage', difficulty: 'advanced' },
          { id: 'mechanism', label: 'schematic.mechanism', difficulty: 'internals' },
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
    ],
  },
];
