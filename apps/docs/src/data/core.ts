import type { Section } from './interface';

export const coreSection: Array<Section> = [
  {
    id: 'profile',
    pages: [
      { id: 'introduction', label: 'core.introduction' },
      { id: 'get-start', label: 'core.getStart' },
    ],
  },
  {
    id: 'components',
    label: 'core.components',
    pages: [
      { id: 'tikz', label: 'core.tikz' },
      { id: 'node', label: 'core.node' },
      { id: 'draw', label: 'core.draw' },
      { id: 'path', label: 'core.path' },
      { id: 'step', label: 'core.step' },
    ],
  },
  {
    id: 'concepts',
    label: 'core.concepts',
    pages: [
      { id: 'positioning', label: 'core.positioning' },
      { id: 'anchors', label: 'core.anchors' },
    ],
  },
];
