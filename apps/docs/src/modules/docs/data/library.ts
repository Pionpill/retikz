import type { Section } from './types';

/** Library 能力包的 Standard 与 Layout 文档导航 */
export const librarySection: Array<Section> = [
  {
    id: 'standard',
    label: 'library.standard',
    document: true,
    pages: [
      { id: 'get-start', label: 'library.standardGetStart' },
      {
        id: 'composite',
        label: 'library.standardComposite',
        children: [
          { id: 'grid', label: 'library.standardGrid' },
          { id: 'axes', label: 'library.standardAxes' },
          { id: 'frame', label: 'library.standardFrame' },
          { id: 'legend', label: 'library.standardLegend' },
        ],
      },
      {
        id: 'extension',
        label: 'library.standardExtension',
        children: [
          {
            id: 'capability-loading',
            label: 'library.standardCapabilityLoading',
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'standard.capability-loading',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'changelog',
        label: 'library.changelog',
        children: [{ id: 'v0-1', label: 'library.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'standard.release',
          sourceOfTruth: 'changelog',
        },
      },
    ],
  },
  {
    id: 'layout',
    label: 'library.layout',
    document: true,
    pages: [
      { id: 'get-start', label: 'library.layoutGetStart' },
      { id: 'flex-layout', label: 'library.flexLayout' },
      { id: 'grid-layout', label: 'library.gridLayout' },
      { id: 'overlay-layout', label: 'library.overlayLayout' },
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
      {
        id: 'changelog',
        label: 'library.changelog',
        children: [{ id: 'v0-1', label: 'library.changelogV01' }],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'layout.release',
          sourceOfTruth: 'changelog',
        },
      },
    ],
  },
];
