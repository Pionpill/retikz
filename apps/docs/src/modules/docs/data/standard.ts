import type { Section } from './types';

/** Standard 可选 Tier 2 能力的文档导航 */
export const standardSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'standard.introduction' },
      { id: 'get-start', label: 'standard.getStart' },
    ],
  },
  {
    id: 'composite',
    label: 'standard.composite',
    document: true,
    pages: [
      { id: 'grid', label: 'standard.grid' },
      { id: 'axes', label: 'standard.axes' },
      { id: 'frame', label: 'standard.frame' },
      { id: 'legend', label: 'standard.legend' },
    ],
  },
  {
    id: 'layout',
    label: 'standard.layout',
    document: true,
    pages: [
      { id: 'flex-layout', label: 'standard.flexLayout' },
      { id: 'grid-layout', label: 'standard.gridLayout' },
      { id: 'overlay-layout', label: 'standard.overlayLayout' },
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
    id: 'logic',
    label: 'standard.logic',
    document: true,
    pages: [
      { id: 'logic-block', label: 'standard.logicBlock' },
      { id: 'semantic-units', label: 'standard.semanticUnits' },
      { id: 'connector', label: 'standard.connector' },
      { id: 'callout', label: 'standard.callout' },
      { id: 'api-reference', label: 'standard.logicApiReference' },
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
