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
        id: 'layout',
        label: 'core.layout',
        children: [
          { id: 'overview', label: 'core.layoutOverview' },
          { id: 'scope', label: 'core.layoutScope' },
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
      {
        id: 'shapes',
        label: 'core.shapes',
        children: [
          { id: 'circle-ellipse', label: 'core.shapesCircleEllipse' },
          { id: 'arc-sector', label: 'core.shapesArcSector' },
          { id: 'rectangle-polygon', label: 'core.shapesRectanglePolygon' },
          { id: 'star', label: 'core.shapesStar' },
          { id: 'grid', label: 'core.shapesGrid' },
        ],
      },
    ],
  },
  {
    id: 'examples',
    label: 'core.examples',
    pages: [
      { id: 'karl-circle', label: 'core.examplesKarlCircle' },
      { id: 'learning-path', label: 'core.examplesLearningPath' },
      { id: 'ohms-law-circuit', label: 'core.examplesOhmsLawCircuit' },
    ],
  },
  {
    id: 'reference',
    label: 'core.reference',
    pages: [
      {
        id: 'extending',
        label: 'core.refExtending',
        children: [
          { id: 'shape-registry', label: 'core.refShapeRegistry' },
          { id: 'custom-arrow', label: 'core.refCustomArrow' },
          { id: 'custom-pattern', label: 'core.refCustomPattern' },
          { id: 'path-generator', label: 'core.refPathGenerator' },
          { id: 'composite', label: 'core.refComposite' },
        ],
      },
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
      {
        id: 'runtime',
        label: 'core.refRuntime',
        children: [
          { id: 'compile', label: 'core.refCompile' },
          { id: 'scene-primitive', label: 'core.refScenePrimitive' },
          { id: 'parser', label: 'core.refParser' },
        ],
      },
    ],
  },
];
