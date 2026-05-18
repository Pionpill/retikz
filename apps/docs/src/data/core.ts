import type { Section } from './interface';

export const coreSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'core.introduction' },
      { id: 'get-start', label: 'core.getStart' },
    ],
  },
  {
    id: 'concepts',
    label: 'core.concepts',
    pages: [
      { id: 'positioning', label: 'core.positioning' },
      { id: 'anchors', label: 'core.anchors' },
      { id: 'layers', label: 'core.layers' },
    ],
  },
  {
    id: 'components',
    label: 'core.components',
    pages: [
      {
        id: 'tikz',
        label: 'core.tikz',
        children: [
          { id: 'overview', label: 'core.tikzOverview' },
          { id: 'scope', label: 'core.tikzScope' },
        ],
      },
      {
        id: 'node',
        label: 'core.node',
        children: [
          { id: 'overview', label: 'core.nodeOverview' },
          { id: 'text', label: 'core.text' },
          { id: 'coordinate', label: 'core.coordinate' },
        ],
      },
      {
        id: 'draw',
        label: 'core.draw',
        children: [
          { id: 'overview', label: 'core.drawOverview' },
          { id: 'way', label: 'core.drawWay' },
          { id: 'path', label: 'core.path' },
          { id: 'arrow', label: 'core.arrow' },
          { id: 'step', label: 'core.step' },
        ],
      },
    ],
  },
  {
    id: 'examples',
    label: 'core.examples',
    pages: [
      { id: 'karl-circle', label: 'core.examplesKarlCircle' },
    ],
  },
  {
    id: 'reference',
    label: 'core.reference',
    pages: [
      {
        id: 'schema',
        label: 'core.refSchema',
        children: [
          { id: 'scene',     label: 'core.refSceneSchema' },
          { id: 'entity',    label: 'core.refEntity' },
          { id: 'path',      label: 'core.refPathSchema' },
          { id: 'placement', label: 'core.refPlacement' },
        ],
      },
    ],
  },
];
