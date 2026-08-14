import type { DocPageMetadataOverride, Section } from './types';

import { DocDifficulty } from './types';

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
      { id: 'introduction', label: 'kernel.introduction', difficulty: DocDifficulty.Beginner },
      { id: 'get-start', label: 'kernel.getStart', difficulty: DocDifficulty.Beginner },
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
          { id: 'coordinate-system', label: 'kernel.coordinateSystem', difficulty: DocDifficulty.Beginner },
          { id: 'position', label: 'kernel.positioning', difficulty: DocDifficulty.Beginner },
        ],
      },
      {
        id: 'core',
        label: 'kernel.coreConcepts',
        children: [
          { id: 'primitive-model', label: 'kernel.primitiveModel', difficulty: DocDifficulty.Advanced },
          { id: 'primitive-relations', label: 'kernel.primitiveRelations', difficulty: DocDifficulty.Advanced },
        ],
      },
      {
        id: 'design',
        label: 'kernel.design',
        children: [
          { id: 'layers', label: 'kernel.layers', difficulty: DocDifficulty.Internals },
          { id: 'composite', label: 'kernel.refComposite', difficulty: DocDifficulty.Internals },
          {
            id: 'principles',
            label: 'kernel.principles',
            difficulty: DocDifficulty.Internals,
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
          { id: 'overview', label: 'kernel.layoutOverview', difficulty: DocDifficulty.Beginner },
          { id: 'scope', label: 'kernel.layoutScope', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-clip',
            label: 'kernel.layoutCustomClip',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.clip'),
          },
        ],
      },
      {
        id: 'node',
        label: 'kernel.node',
        children: [
          { id: 'overview', label: 'kernel.nodeOverview', difficulty: DocDifficulty.Beginner },
          { id: 'text', label: 'kernel.text', difficulty: DocDifficulty.Advanced },
          { id: 'coordinate', label: 'kernel.coordinate', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-boundary',
            label: 'kernel.nodeCustomBoundary',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.boundary'),
          },
        ],
      },
      {
        id: 'draw',
        label: 'kernel.draw',
        children: [
          { id: 'overview', label: 'kernel.drawOverview', difficulty: DocDifficulty.Beginner },
          { id: 'way', label: 'kernel.drawWay', difficulty: DocDifficulty.Advanced },
          { id: 'path', label: 'kernel.path', difficulty: DocDifficulty.Advanced },
          { id: 'ribbon', label: 'kernel.ribbon', difficulty: DocDifficulty.Advanced },
          { id: 'step', label: 'kernel.step', difficulty: DocDifficulty.Advanced },
          { id: 'arrow', label: 'kernel.arrow', difficulty: DocDifficulty.Advanced },
          {
            id: 'path-generator',
            label: 'kernel.drawPathGenerator',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.path-generator'),
          },
          {
            id: 'custom-path',
            label: 'kernel.drawCustomPath',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.path-kind'),
          },
          {
            id: 'custom-arrow',
            label: 'kernel.drawCustomArrow',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.arrow'),
          },
        ],
      },
      {
        id: 'shapes',
        label: 'kernel.shapes',
        children: [
          { id: 'circle-ellipse', label: 'kernel.shapesCircleEllipse', difficulty: DocDifficulty.Beginner },
          { id: 'arc-sector', label: 'kernel.shapesArcSector', difficulty: DocDifficulty.Beginner },
          { id: 'rectangle', label: 'kernel.shapesRectangle', difficulty: DocDifficulty.Beginner },
          { id: 'polygon', label: 'kernel.shapesPolygon', difficulty: DocDifficulty.Beginner },
          { id: 'star', label: 'kernel.shapesStar', difficulty: DocDifficulty.Beginner },
          { id: 'contour', label: 'kernel.shapesContour', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-shape',
            label: 'kernel.shapesCustomShape',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.shape'),
          },
        ],
      },
      {
        id: 'effects',
        label: 'kernel.effects',
        children: [
          { id: 'shadow', label: 'kernel.effectsShadow', difficulty: DocDifficulty.Beginner },
          { id: 'blend', label: 'kernel.effectsBlend', difficulty: DocDifficulty.Beginner },
          { id: 'animation', label: 'kernel.effectsAnimation', difficulty: DocDifficulty.Advanced },
          { id: 'pattern', label: 'kernel.effectsPattern', difficulty: DocDifficulty.Advanced },
          {
            id: 'custom-pattern',
            label: 'kernel.effectsCustomPattern',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.pattern'),
          },
          {
            id: 'custom-animation',
            label: 'kernel.effectsCustomAnimation',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.animation'),
          },
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
        children: [{ id: 'plot', label: 'kernel.refVisualizationPlot', difficulty: DocDifficulty.Advanced }],
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
          { id: 'compile', label: 'kernel.refCompile', difficulty: DocDifficulty.Internals },
          { id: 'scene-primitive', label: 'kernel.refScenePrimitive', difficulty: DocDifficulty.Internals },
          { id: 'parser', label: 'kernel.refParser', difficulty: DocDifficulty.Internals },
          {
            id: 'extensions',
            label: 'kernel.refExtensions',
            difficulty: DocDifficulty.Internals,
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
      {
        id: 'base',
        label: 'kernel.pkgGroupBase',
        children: [
          { id: 'foundation', label: 'kernel.pkgFoundation', difficulty: DocDifficulty.Internals },
          { id: 'math-primitives', label: 'kernel.pkgMathPrimitives', difficulty: DocDifficulty.Internals },
          { id: 'math-algorithms', label: 'kernel.pkgMathAlgorithms', difficulty: DocDifficulty.Internals },
        ],
      },
      {
        id: 'core',
        label: 'kernel.pkgGroupCore',
        children: [
          { id: 'core', label: 'kernel.pkgCore', difficulty: DocDifficulty.Internals },
          { id: 'runtime', label: 'kernel.pkgRuntime', difficulty: DocDifficulty.Internals },
          { id: 'runtime-session', label: 'kernel.pkgRuntimeSession', difficulty: DocDifficulty.Internals },
        ],
      },
      {
        id: 'extension',
        label: 'kernel.pkgGroupExtension',
        children: [
          { id: 'tex', label: 'kernel.pkgTex', difficulty: DocDifficulty.Internals },
          {
            id: 'inspect',
            label: 'kernel.pkgInspect',
            difficulty: DocDifficulty.Internals,
            meta: extensionGuide('kernel.inspect'),
          },
        ],
      },
      {
        id: 'framework',
        label: 'kernel.pkgGroupFramework',
        children: [
          { id: 'vanilla', label: 'kernel.pkgVanilla', difficulty: DocDifficulty.Internals },
          { id: 'react', label: 'kernel.pkgReact', difficulty: DocDifficulty.Internals },
        ],
      },
      {
        id: 'render',
        label: 'kernel.pkgGroupRender',
        children: [
          { id: 'render', label: 'kernel.pkgRender', difficulty: DocDifficulty.Internals },
          { id: 'render-svg', label: 'kernel.pkgRenderSvg', difficulty: DocDifficulty.Internals },
          { id: 'render-canvas', label: 'kernel.pkgRenderCanvas', difficulty: DocDifficulty.Internals },
          { id: 'render-hydration', label: 'kernel.pkgHydration', difficulty: DocDifficulty.Internals },
        ],
      },
    ],
  },
  {
    id: 'examples',
    label: 'kernel.examples',
    document: true,
    pages: [
      { id: 'karl-circle', label: 'kernel.examplesKarlCircle', difficulty: DocDifficulty.Beginner },
      { id: 'learning-path', label: 'kernel.examplesLearningPath', difficulty: DocDifficulty.Advanced },
      { id: 'ohms-law-circuit', label: 'kernel.examplesOhmsLawCircuit', difficulty: DocDifficulty.Advanced },
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
