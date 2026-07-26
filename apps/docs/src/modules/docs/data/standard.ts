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
