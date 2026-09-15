import type { Section } from './types';

/** Library 能力包的 Standard 与 Layout 文档导航 */
export const librarySection: Array<Section> = [
  {
    id: 'standard',
    label: 'library.standard',
    navigationDescription: 'library.standardNavigationDescription',
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
      {
        id: 'legend',
        label: 'library.standardLegend',
        difficulty: 'advanced',
        sidebarGroup: 'library.standardComposite',
      },
      {
        id: 'shape',
        label: 'library.standardExtensionShape',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'standard.shape',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.standardExtension',
      },
      {
        id: 'arrow',
        label: 'library.standardExtensionArrow',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'standard.arrow',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.standardExtension',
      },
      {
        id: 'clip',
        label: 'library.standardExtensionClip',
        difficulty: 'beginner',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'standard.clip',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.standardExtension',
      },
      {
        id: 'ribbon',
        label: 'library.standardExtensionRibbon',
        difficulty: 'advanced',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'standard.ribbon',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.standardExtension',
      },
      {
        id: 'capability-loading',
        label: 'library.standardCapabilityLoading',
        difficulty: 'internals',
        meta: {
          pageType: 'extension',
          audience: 'extension-author',
          capability: 'standard.capability-loading',
          sourceOfTruth: 'runtime',
        },
        sidebarGroup: 'library.standardExtension',
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
        difficulty: 'advanced',
      },
      {
        id: 'grid-layout',
        label: 'library.gridLayout',
        difficulty: 'advanced',
      },
      {
        id: 'overlay-layout',
        label: 'library.overlayLayout',
        difficulty: 'advanced',
      },
      {
        id: 'reference',
        label: 'library.layoutReference',
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
