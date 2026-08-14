import type { Section } from './types';

import { DocDifficulty } from './types';

/** Library 能力包的 Standard 与 Layout 文档导航 */
export const librarySection: Array<Section> = [
  {
    id: 'standard',
    label: 'library.standard',
    document: true,
    pages: [
      {
        id: 'composite',
        label: 'library.standardComposite',
        children: [
          { id: 'grid', label: 'library.standardGrid', difficulty: DocDifficulty.Beginner },
          { id: 'axes', label: 'library.standardAxes', difficulty: DocDifficulty.Advanced },
          { id: 'frame', label: 'library.standardFrame', difficulty: DocDifficulty.Advanced },
          { id: 'surface', label: 'library.standardSurface', difficulty: DocDifficulty.Advanced },
          { id: 'legend', label: 'library.standardLegend', difficulty: DocDifficulty.Advanced },
        ],
      },
      {
        id: 'extension',
        label: 'library.standardExtension',
        children: [
          {
            id: 'shape',
            label: 'library.standardExtensionShape',
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'standard.shape',
              sourceOfTruth: 'runtime',
            },
          },
          {
            id: 'arrow',
            label: 'library.standardExtensionArrow',
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'standard.arrow',
              sourceOfTruth: 'runtime',
            },
          },
          {
            id: 'clip',
            label: 'library.standardExtensionClip',
            difficulty: DocDifficulty.Beginner,
            meta: {
              pageType: 'extension',
              audience: 'extension-author',
              capability: 'standard.clip',
              sourceOfTruth: 'runtime',
            },
          },
          {
            id: 'capability-loading',
            label: 'library.standardCapabilityLoading',
            difficulty: DocDifficulty.Advanced,
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
      { id: 'flex-layout', label: 'library.flexLayout', difficulty: DocDifficulty.Advanced },
      { id: 'grid-layout', label: 'library.gridLayout', difficulty: DocDifficulty.Advanced },
      { id: 'overlay-layout', label: 'library.overlayLayout', difficulty: DocDifficulty.Advanced },
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
