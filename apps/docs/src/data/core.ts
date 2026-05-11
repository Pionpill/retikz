import type { Section } from './interface';

export const coreSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'core.introduction' },
      { id: 'get-start', label: 'core.getStart' },
      { id: 'reading-guide', label: 'core.readingGuide' },
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
          { id: 'path', label: 'core.path' },
          { id: 'step', label: 'core.step' },
        ],
      },
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
  {
    id: 'reference',
    label: 'core.reference',
    pages: [
      { id: 'scene', label: 'core.refSceneSchema' },
      {
        id: 'entity',
        label: 'core.refEntity',
        children: [
          { id: 'overview',   label: 'core.refEntityOverview' },
          { id: 'node',       label: 'core.refNodeSchema' },
          { id: 'coordinate', label: 'core.refCoordinateSchema' },
        ],
      },
      {
        id: 'stroke',
        label: 'core.refStroke',
        children: [
          { id: 'overview', label: 'core.refStrokeOverview' },
          { id: 'path',     label: 'core.refPathSchema' },
          { id: 'step',     label: 'core.refStepSchema' },
          { id: 'target',   label: 'core.refTargetSchema' },
        ],
      },
      {
        id: 'placement',
        label: 'core.refPlacement',
        children: [
          { id: 'overview',        label: 'core.refPlacementOverview' },
          { id: 'position',        label: 'core.refPositionSchema' },
          { id: 'polar-position',  label: 'core.refPolarPositionSchema' },
          { id: 'at-position',     label: 'core.refAtPositionSchema' },
        ],
      },
    ],
  },
];
