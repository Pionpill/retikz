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
      { id: 'ir-scene', label: 'core.irScene' },
      { id: 'kernel-sugar', label: 'core.kernelSugar' },
    ],
  },
  {
    id: 'components',
    label: 'core.components',
    pages: [
      { id: 'tikz', label: 'core.tikz' },
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
          { id: 'curves', label: 'core.drawCurves' },
          { id: 'labels', label: 'core.drawLabels' },
          { id: 'styling', label: 'core.drawStyling' },
          { id: 'path', label: 'core.path' },
          { id: 'arrow', label: 'core.arrow' },
          { id: 'step', label: 'core.step' },
        ],
      },
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
