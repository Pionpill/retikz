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
      {
        id: 'design',
        label: 'core.design',
        children: [
          { id: 'layers', label: 'core.layers' },
          { id: 'composite', label: 'core.refComposite' },
        ],
      },
      {
        id: 'basic',
        label: 'core.basicConcepts',
        children: [
          { id: 'coordinate-system', label: 'core.coordinateSystem' },
          { id: 'position', label: 'core.positioning' },
        ],
      },
      {
        id: 'core',
        label: 'core.coreConcepts',
        children: [
          { id: 'primitive-model', label: 'core.primitiveModel' },
          { id: 'primitive-relations', label: 'core.primitiveRelations' },
        ],
      },
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
          { id: 'rectangle', label: 'core.shapesRectangle' },
          { id: 'polygon', label: 'core.shapesPolygon' },
          { id: 'star', label: 'core.shapesStar' },
        ],
      },
      {
        id: 'helpers',
        label: 'core.helpers',
        children: [
          { id: 'grid', label: 'core.helpersGrid' },
        ],
      },
      {
        id: 'animation',
        label: 'core.animation',
        children: [
          { id: 'entrance', label: 'core.animationEntrance' },
          { id: 'emphasis', label: 'core.animationEmphasis' },
          { id: 'camera', label: 'core.animationCamera' },
          { id: 'control', label: 'core.animationControl' },
        ],
      },
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
          { id: 'custom-animation', label: 'core.refCustomAnimation' },
        ],
      },
      {
        id: 'composites',
        label: 'core.refComposites',
        children: [
          { id: 'plot', label: 'core.refPlot' },
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
        id: 'renderer',
        label: 'core.refRenderer',
        children: [
          { id: 'svg', label: 'core.refRendererSvg' },
          { id: 'canvas', label: 'core.refRendererCanvas' },
          { id: 'hydration', label: 'core.refHydration' },
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
    id: 'releases',
    label: 'core.releases',
    pages: [
      {
        id: 'changelog',
        label: 'core.changelog',
        children: [
          { id: 'v0-3', label: 'core.changelogV03' },
          { id: 'v0-2', label: 'core.changelogV02' },
          { id: 'v0-1', label: 'core.changelogV01' },
        ],
      },
    ],
  },
];
