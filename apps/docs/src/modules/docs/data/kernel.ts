import type { DocPageMetadataOverride, Section } from './types';

/** 标记以 Definition / registry 为主线的扩展指南。 */
const extensionGuide = (capability: string): DocPageMetadataOverride => ({
  pageType: 'extension',
  audience: 'extension-author',
  capability,
  sourceOfTruth: 'runtime',
});

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
    document: true,
    pages: [
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
      {
        id: 'design',
        label: 'kernel.design',
        children: [
          { id: 'layers', label: 'kernel.layers' },
          { id: 'composite', label: 'kernel.refComposite' },
          {
            id: 'principles',
            label: 'kernel.principles',
            meta: {
              pageType: 'architecture',
              audience: 'maintainer',
              capability: 'kernel.architecture',
              sourceOfTruth: 'architecture',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'components',
    label: 'kernel.components',
    document: true,
    pages: [
      {
        id: 'layout',
        label: 'kernel.layout',
        children: [
          { id: 'overview', label: 'kernel.layoutOverview' },
          { id: 'scope', label: 'kernel.layoutScope' },
          { id: 'custom-clip', label: 'kernel.layoutCustomClip', meta: extensionGuide('kernel.clip') },
        ],
      },
      {
        id: 'node',
        label: 'kernel.node',
        children: [
          { id: 'overview', label: 'kernel.nodeOverview' },
          { id: 'text', label: 'kernel.text' },
          { id: 'coordinate', label: 'kernel.coordinate' },
          { id: 'custom-boundary', label: 'kernel.nodeCustomBoundary', meta: extensionGuide('kernel.boundary') },
        ],
      },
      {
        id: 'draw',
        label: 'kernel.draw',
        children: [
          { id: 'overview', label: 'kernel.drawOverview' },
          { id: 'way', label: 'kernel.drawWay' },
          { id: 'path', label: 'kernel.path' },
          { id: 'ribbon', label: 'kernel.ribbon' },
          { id: 'step', label: 'kernel.step' },
          { id: 'arrow', label: 'kernel.arrow' },
          { id: 'path-generator', label: 'kernel.drawPathGenerator', meta: extensionGuide('kernel.path-generator') },
          { id: 'custom-path', label: 'kernel.drawCustomPath', meta: extensionGuide('kernel.path-kind') },
          { id: 'custom-arrow', label: 'kernel.drawCustomArrow', meta: extensionGuide('kernel.arrow') },
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
          { id: 'custom-shape', label: 'kernel.shapesCustomShape', meta: extensionGuide('kernel.shape') },
        ],
      },
      {
        id: 'effects',
        label: 'kernel.effects',
        children: [
          { id: 'shadow', label: 'kernel.effectsShadow' },
          { id: 'blend', label: 'kernel.effectsBlend' },
          { id: 'animation', label: 'kernel.effectsAnimation' },
          { id: 'pattern', label: 'kernel.effectsPattern' },
          { id: 'custom-pattern', label: 'kernel.effectsCustomPattern', meta: extensionGuide('kernel.pattern') },
          { id: 'custom-animation', label: 'kernel.effectsCustomAnimation', meta: extensionGuide('kernel.animation') },
        ],
      },
    ],
  },
  {
    id: 'reference',
    label: 'kernel.reference',
    document: true,
    pages: [
      {
        id: 'domains',
        label: 'kernel.refDomains',
        children: [{ id: 'plot', label: 'kernel.refVisualizationPlot' }],
      },
      {
        id: 'schema',
        label: 'kernel.refSchema',
        children: [
          { id: 'scene', label: 'kernel.refSceneSchema' },
          { id: 'scope', label: 'kernel.refScopeSchema' },
          { id: 'entity', label: 'kernel.refEntity' },
          { id: 'path', label: 'kernel.refPathSchema' },
          { id: 'placement', label: 'kernel.refPlacement' },
          { id: 'style', label: 'kernel.refStyleSchema' },
          { id: 'animation', label: 'kernel.refAnimationSchema' },
        ],
      },
      {
        id: 'runtime',
        label: 'kernel.refRuntime',
        children: [
          { id: 'compile', label: 'kernel.refCompile' },
          { id: 'scene-primitive', label: 'kernel.refScenePrimitive' },
          { id: 'parser', label: 'kernel.refParser' },
          {
            id: 'extensions',
            label: 'kernel.refExtensions',
            meta: {
              pageType: 'reference',
              audience: 'extension-author',
              capability: 'kernel.extensions',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'packages',
    label: 'kernel.packages',
    document: true,
    pages: [
      { id: 'runtime', label: 'kernel.pkgRuntime', meta: extensionGuide('kernel.runtime-owner') },
      { id: 'react', label: 'kernel.pkgReact' },
      { id: 'vanilla', label: 'kernel.pkgVanilla' },
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
    id: 'examples',
    label: 'kernel.examples',
    document: true,
    pages: [
      { id: 'karl-circle', label: 'kernel.examplesKarlCircle' },
      { id: 'learning-path', label: 'kernel.examplesLearningPath' },
      { id: 'ohms-law-circuit', label: 'kernel.examplesOhmsLawCircuit' },
    ],
  },
  {
    id: 'releases',
    label: 'kernel.releases',
    document: true,
    pages: [
      {
        id: 'changelog',
        label: 'kernel.changelog',
        children: [
          { id: 'v0-5', label: 'kernel.changelogV05' },
          { id: 'v0-4', label: 'kernel.changelogV04' },
          { id: 'v0-3', label: 'kernel.changelogV03' },
          { id: 'v0-2', label: 'kernel.changelogV02' },
          { id: 'v0-1', label: 'kernel.changelogV01' },
        ],
      },
    ],
  },
];
