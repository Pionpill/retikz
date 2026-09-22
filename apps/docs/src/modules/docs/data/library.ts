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
        id: 'grid',
        label: 'library.standardGrid',
        difficulty: 'beginner',
        sidebarGroup: 'library.standardComposite',
      },
      {
        id: 'axes',
        label: 'library.standardAxes',
        difficulty: 'advanced',
        sidebarGroup: 'library.standardComposite',
      },
      {
        id: 'frame',
        label: 'library.standardFrame',
        difficulty: 'advanced',
        sidebarGroup: 'library.standardComposite',
      },
      {
        id: 'surface',
        label: 'library.standardSurface',
        difficulty: 'advanced',
        sidebarGroup: 'library.standardComposite',
      },
      { id: 'list', label: 'library.standardList', difficulty: 'beginner', sidebarGroup: 'library.standardComposite' },
      { id: 'map', label: 'library.standardMap', difficulty: 'beginner', sidebarGroup: 'library.standardComposite' },
      {
        id: 'legend',
        label: 'library.standardLegend',
        difficulty: 'advanced',
        sidebarGroup: 'library.standardComposite',
      },
      {
        id: 'circle-ellipse',
        label: 'library.standardCircleEllipse',
        difficulty: 'beginner',
        sidebarGroup: 'library.standardShapes',
      },
      {
        id: 'rectangle',
        label: 'library.standardRectangle',
        difficulty: 'beginner',
        sidebarGroup: 'library.standardShapes',
      },
      {
        id: 'regular-polygon',
        label: 'library.standardRegularPolygon',
        difficulty: 'beginner',
        sidebarGroup: 'library.standardShapes',
      },
      { id: 'star', label: 'library.standardStar', difficulty: 'beginner', sidebarGroup: 'library.standardShapes' },
      {
        id: 'arc-sector',
        label: 'library.standardArcSector',
        difficulty: 'beginner',
        sidebarGroup: 'library.standardShapes',
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
        sidebarGroup: 'library.extensionCapabilities',
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
        sidebarGroup: 'library.extensionCapabilities',
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
        sidebarGroup: 'library.extensionCapabilities',
      },
      {
        id: 'ribbon',
        label: 'library.extensionRibbon',
        difficulty: 'advanced',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'extension.ribbon',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.extensionCapabilities',
      },
      {
        id: 'capability-loading',
        label: 'library.extensionCapabilityLoading',
        difficulty: 'internals',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'extension.capability-loading',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.extensionCapabilities',
      },
      {
        id: 'animation',
        label: 'library.standardAnimation',
        sidebarGroup: 'library.extensionCapabilities',
        meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
        children: [
          {
            id: 'api-reference',
            label: 'kernel.visualApiReference',
            meta: { pageType: 'reference', audience: 'user', sourceOfTruth: 'runtime' },
          },
        ],
      },
    ],
  },
  {
    id: 'layout',
    label: 'library.layout',
    navigationDescription: 'library.layoutNavigationDescription',
    document: true,
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
        difficulty: 'advanced',
      },
      {
        id: 'grid-layout',
        label: 'library.gridLayout',
        sidebarGroup: 'library.components',
        difficulty: 'advanced',
      },
      {
        id: 'overlay-layout',
        label: 'library.overlayLayout',
        sidebarGroup: 'library.components',
        difficulty: 'advanced',
      },
      {
        id: 'reference',
        label: 'library.layoutReference',
        sidebarGroup: 'library.components',
        children: [
          {
            id: 'contract-input',
            label: 'library.layoutContractInput',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'layout.input',
              sourceOfTruth: 'schema',
            },
          },
          {
            id: 'contract-artifact',
            label: 'library.layoutContractArtifact',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'layout.artifact',
              sourceOfTruth: 'schema',
            },
          },
          {
            id: 'runtime',
            label: 'library.layoutRuntime',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'layout.runtime',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
    ],
  },
];
