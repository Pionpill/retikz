import type { Section } from './interface';

export const kernelSection: Array<Section> = [
  {
    pages: [
      { id: 'introduction', label: 'kernel.introduction' },
      { id: 'get-start', label: 'kernel.getStart' },
    ],
  },
  {
    id: 'concepts',
    label: 'kernel.concepts',
    pages: [
      {
        id: 'design',
        label: 'kernel.design',
        children: [
          { id: 'layers', label: 'kernel.layers' },
          { id: 'composite', label: 'kernel.refComposite' },
        ],
      },
      {
        id: 'basic',
        label: 'kernel.basicConcepts',
        children: [
          { id: 'coordinate-system', label: 'kernel.coordinateSystem' },
          { id: 'position', label: 'kernel.positioning' },
        ],
      },
      {
        id: 'core',
        label: 'kernel.coreConcepts',
        children: [
          { id: 'primitive-model', label: 'kernel.primitiveModel' },
          { id: 'primitive-relations', label: 'kernel.primitiveRelations' },
        ],
      },
    ],
  },
  {
    id: 'components',
    label: 'kernel.components',
    pages: [
      {
        id: 'layout',
        label: 'kernel.layout',
        children: [
          { id: 'overview', label: 'kernel.layoutOverview' },
          { id: 'scope', label: 'kernel.layoutScope' },
        ],
      },
      {
        id: 'node',
        label: 'kernel.node',
        children: [
          { id: 'overview', label: 'kernel.nodeOverview' },
          { id: 'text', label: 'kernel.text' },
          { id: 'coordinate', label: 'kernel.coordinate' },
        ],
      },
      {
        id: 'draw',
        label: 'kernel.draw',
        children: [
          { id: 'overview', label: 'kernel.drawOverview' },
          { id: 'way', label: 'kernel.drawWay' },
          { id: 'path', label: 'kernel.path' },
          { id: 'arrow', label: 'kernel.arrow' },
          { id: 'step', label: 'kernel.step' },
        ],
      },
      {
        id: 'shapes',
        label: 'kernel.shapes',
        children: [
          { id: 'circle-ellipse', label: 'kernel.shapesCircleEllipse' },
          { id: 'arc-sector', label: 'kernel.shapesArcSector' },
          { id: 'rectangle', label: 'kernel.shapesRectangle' },
          { id: 'polygon', label: 'kernel.shapesPolygon' },
          { id: 'star', label: 'kernel.shapesStar' },
          { id: 'contour', label: 'kernel.shapesContour' },
        ],
      },
      {
        id: 'helpers',
        label: 'kernel.helpers',
        children: [{ id: 'grid', label: 'kernel.helpersGrid' }],
      },
      {
        id: 'effects',
        label: 'kernel.effects',
        children: [
          { id: 'shadow', label: 'kernel.effectsShadow' },
          { id: 'blend', label: 'kernel.effectsBlend' },
          { id: 'animation', label: 'kernel.effectsAnimation' },
        ],
      },
      {
        id: 'extend',
        label: 'kernel.refExtending',
        children: [
          { id: 'shape-registry', label: 'kernel.refShapeRegistry' },
          { id: 'boundary-registry', label: 'kernel.refBoundaryRegistry' },
          { id: 'clip-registry', label: 'kernel.refClipRegistry' },
          { id: 'custom-arrow', label: 'kernel.refCustomArrow' },
          { id: 'custom-pattern', label: 'kernel.refCustomPattern' },
          { id: 'custom-path', label: 'kernel.refCustomPath' },
          { id: 'path-generator', label: 'kernel.refPathGenerator' },
          { id: 'custom-animation', label: 'kernel.refCustomAnimation' },
        ],
      },
    ],
  },
  {
    id: 'packages',
    label: 'kernel.packages',
    pages: [
      { id: 'tex', label: 'kernel.pkgTex' },
      {
        id: 'math',
        label: 'kernel.pkgMath',
        children: [
          { id: 'primitives', label: 'kernel.pkgMathPrimitives' },
          { id: 'algorithms', label: 'kernel.pkgMathAlgorithms' },
        ],
      },
      {
        id: 'render',
        label: 'kernel.pkgRender',
        children: [
          { id: 'svg', label: 'kernel.pkgRenderSvg' },
          { id: 'canvas', label: 'kernel.pkgRenderCanvas' },
          { id: 'hydration', label: 'kernel.pkgHydration' },
        ],
      },
    ],
  },
  {
    id: 'reference',
    label: 'kernel.reference',
    pages: [
      {
        id: 'composites',
        label: 'kernel.refComposites',
        children: [{ id: 'plot', label: 'kernel.refPlot' }],
      },
      {
        id: 'schema',
        label: 'kernel.refSchema',
        children: [
          { id: 'scene', label: 'kernel.refSceneSchema' },
          { id: 'entity', label: 'kernel.refEntity' },
          { id: 'path', label: 'kernel.refPathSchema' },
          { id: 'placement', label: 'kernel.refPlacement' },
        ],
      },
      {
        id: 'runtime',
        label: 'kernel.refRuntime',
        children: [
          { id: 'compile', label: 'kernel.refCompile' },
          { id: 'scene-primitive', label: 'kernel.refScenePrimitive' },
          { id: 'parser', label: 'kernel.refParser' },
        ],
      },
    ],
  },
  {
    id: 'examples',
    label: 'kernel.examples',
    pages: [
      { id: 'karl-circle', label: 'kernel.examplesKarlCircle' },
      { id: 'learning-path', label: 'kernel.examplesLearningPath' },
      { id: 'ohms-law-circuit', label: 'kernel.examplesOhmsLawCircuit' },
    ],
  },
  {
    id: 'releases',
    label: 'kernel.releases',
    pages: [
      {
        id: 'changelog',
        label: 'kernel.changelog',
        children: [
          { id: 'v0-3', label: 'kernel.changelogV03' },
          { id: 'v0-2', label: 'kernel.changelogV02' },
          { id: 'v0-1', label: 'kernel.changelogV01' },
        ],
      },
    ],
  },
];
