import type { Section } from './types';

import { DocDifficulty } from './types';

/** Standard 可选 Tier 2 能力的文档导航 */
export const standardSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'standard.introduction', difficulty: DocDifficulty.Beginner },
      { id: 'get-start', label: 'standard.getStart', difficulty: DocDifficulty.Beginner },
    ],
  },
  {
    id: 'composite',
    label: 'standard.composite',
    document: true,
    pages: [
      { id: 'grid', label: 'standard.grid', difficulty: DocDifficulty.Beginner },
      { id: 'axes', label: 'standard.axes', difficulty: DocDifficulty.Advanced },
      { id: 'frame', label: 'standard.frame', difficulty: DocDifficulty.Advanced },
      { id: 'legend', label: 'standard.legend', difficulty: DocDifficulty.Advanced },
    ],
  },
  {
    id: 'layout',
    label: 'standard.layout',
    document: true,
    pages: [
      { id: 'flex-layout', label: 'standard.flexLayout', difficulty: DocDifficulty.Advanced },
      { id: 'grid-layout', label: 'standard.gridLayout', difficulty: DocDifficulty.Advanced },
      { id: 'overlay-layout', label: 'standard.overlayLayout', difficulty: DocDifficulty.Advanced },
      {
        id: 'reference',
        label: 'standard.layoutReference',
        children: [
          {
            id: 'contract-input',
            label: 'standard.layoutContractInput',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'standard.layout',
              sourceOfTruth: 'schema',
            },
          },
          {
            id: 'contract-artifact',
            label: 'standard.layoutContractArtifact',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'standard.layout',
              sourceOfTruth: 'schema',
            },
          },
          {
            id: 'runtime',
            label: 'standard.layoutRuntime',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'standard.layout',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'extension',
    label: 'standard.extension',
    document: true,
    pages: [
      {
        id: 'capability-loading',
        label: 'standard.capabilityLoading',
        difficulty: DocDifficulty.Internals,
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
    id: 'releases',
    label: 'standard.releases',
    pages: [
      {
        id: 'changelog',
        label: 'standard.changelog',
        children: [{ id: 'v0-1', label: 'standard.changelogV01' }],
      },
    ],
  },
];
