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
    id: 'components',
    label: 'kernel.components',
    navigationDescription: 'kernel.componentsNavigationDescription',
    document: true,
    pages: [
      {
        id: 'introduction',
        label: 'kernel.introduction',
        difficulty: DocDifficulty.Beginner,
        meta: { pageType: 'entry', audience: 'user' },
      },
      {
        id: 'get-start',
        label: 'kernel.getStart',
        difficulty: DocDifficulty.Beginner,
        meta: { pageType: 'entry', audience: 'user' },
      },
      {
        id: 'changelog',
        label: 'kernel.changelog',
        children: [
          {
            id: 'v0-5',
            label: 'kernel.changelogV05',
            meta: { pageType: 'release', audience: 'user', sourceOfTruth: 'changelog' },
          },
          {
            id: 'v0-4',
            label: 'kernel.changelogV04',
            meta: { pageType: 'release', audience: 'user', sourceOfTruth: 'changelog' },
          },
          {
            id: 'v0-3',
            label: 'kernel.changelogV03',
            meta: { pageType: 'release', audience: 'user', sourceOfTruth: 'changelog' },
          },
          {
            id: 'v0-2',
            label: 'kernel.changelogV02',
            meta: { pageType: 'release', audience: 'user', sourceOfTruth: 'changelog' },
          },
          {
            id: 'v0-1',
            label: 'kernel.changelogV01',
            meta: { pageType: 'release', audience: 'user', sourceOfTruth: 'changelog' },
          },
        ],
        meta: {
          pageType: 'release',
          audience: 'user',
          capability: 'kernel.release',
          sourceOfTruth: 'changelog',
        },
      },
      {
        id: 'basic',
        label: 'kernel.basicConcepts',
        sidebarGroup: 'kernel.concepts',
        children: [
          {
            id: 'coordinate-system',
            label: 'kernel.coordinateSystem',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'position',
            label: 'kernel.positioning',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'core',
        label: 'kernel.coreConcepts',
        sidebarGroup: 'kernel.concepts',
        children: [
          {
            id: 'primitive-model',
            label: 'kernel.primitiveModel',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'primitive-relations',
            label: 'kernel.primitiveRelations',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'design',
        label: 'kernel.design',
        sidebarGroup: 'kernel.concepts',
        children: [
          {
            id: 'layers',
            label: 'kernel.layers',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'sugar',
            label: 'kernel.sugar',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'composite',
            label: 'kernel.refComposite',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'theme',
            label: 'kernel.theme',
            difficulty: DocDifficulty.Advanced,
            meta: { pageType: 'concept', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'principles',
            label: 'kernel.principles',
            difficulty: DocDifficulty.Advanced,
            meta: {
              pageType: 'architecture',
              audience: 'maintainer',
              capability: 'kernel.architecture',
              sourceOfTruth: 'architecture',
            },
          },
        ],
      },
      {
        id: 'layout',
        label: 'kernel.layout',
        sidebarGroup: 'kernel.components',
        children: [
          {
            id: 'usage',
            label: 'kernel.layoutUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'extended-usage',
            label: 'kernel.layoutExtendedUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          { id: 'mechanism', label: 'kernel.layoutMechanism', difficulty: DocDifficulty.Internals },
          {
            id: 'api-reference',
            label: 'kernel.layoutApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.layoutSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'scope',
        label: 'kernel.scope',
        sidebarGroup: 'kernel.components',
        children: [
          {
            id: 'usage',
            label: 'kernel.scopeUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'custom',
            label: 'kernel.scopeCustom',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.clip'),
          },
          { id: 'mechanism', label: 'kernel.scopeMechanism', difficulty: DocDifficulty.Internals },
          {
            id: 'api-reference',
            label: 'kernel.scopeApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.scopeSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'node',
        label: 'kernel.node',
        sidebarGroup: 'kernel.components',
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
        sidebarGroup: 'kernel.components',
        children: [
          { id: 'overview', label: 'kernel.drawOverview', difficulty: DocDifficulty.Beginner },
          { id: 'way', label: 'kernel.drawWay', difficulty: DocDifficulty.Advanced },
          { id: 'path', label: 'kernel.path', difficulty: DocDifficulty.Advanced },
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
        sidebarGroup: 'kernel.components',
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
        sidebarGroup: 'kernel.components',
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
      {
        id: 'internals',
        label: 'kernel.internalMechanisms',
        sidebarGroup: 'kernel.internals',
        children: [
          {
            id: 'compilation',
            label: 'kernel.compilation',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime', capability: 'kernel.compile' },
          },
          {
            id: 'theme',
            label: 'kernel.themeResolution',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime', capability: 'kernel.theme' },
          },
        ],
      },
      {
        id: 'composite',
        label: 'kernel.compositeComponents',
        sidebarGroup: 'kernel.internals',
        children: [
          {
            id: 'custom',
            label: 'kernel.compositeCustom',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.composite'),
          },
          {
            id: 'mechanism',
            label: 'kernel.compositeMechanism',
            difficulty: DocDifficulty.Internals,
            meta: {
              pageType: 'guide',
              audience: 'maintainer',
              sourceOfTruth: 'runtime',
              capability: 'kernel.composite',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'reference',
    label: 'kernel.reference',
    navigationOrder: 2,
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
    navigationDescription: 'kernel.packagesNavigationDescription',
    navigationOrder: 1,
    document: true,
    pages: [
      {
        id: 'foundation',
        label: 'kernel.pkgFoundation',
        sidebarGroup: 'kernel.pkgGroupBase',
        children: [
          {
            id: 'utilities',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgFoundationUtilities',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'types-schemas',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgFoundationTypesSchemas',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'validation-errors',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgFoundationValidationErrors',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'api-reference',
            label: 'kernel.pkgFoundationApiReference',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'kernel.foundation.api',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'math',
        label: 'kernel.pkgMath',
        sidebarGroup: 'kernel.pkgGroupBase',
        children: [
          {
            id: 'primitives',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgMathPrimitives',
            difficulty: DocDifficulty.Internals,
          },
          {
            id: 'transforms',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgMathTransforms',
            difficulty: DocDifficulty.Internals,
          },
          {
            id: 'algorithms',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgMathAlgorithms',
            difficulty: DocDifficulty.Internals,
          },
          {
            id: 'api-reference',
            label: 'kernel.pkgMathApiReference',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'kernel.math.api',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'core',
        label: 'kernel.pkgCore',
        sidebarGroup: 'kernel.pkgGroupCore',
        children: [{ id: 'overview', label: 'kernel.pkgOverview', difficulty: DocDifficulty.Internals }],
      },
      {
        id: 'runtime',
        label: 'kernel.pkgRuntime',
        sidebarGroup: 'kernel.pkgGroupCore',
        children: [
          { id: 'overview', label: 'kernel.pkgOverview', difficulty: DocDifficulty.Internals },
          { id: 'session', label: 'kernel.pkgRuntimeSession', difficulty: DocDifficulty.Internals },
        ],
      },
      {
        id: 'tex',
        label: 'kernel.pkgTex',
        sidebarGroup: 'kernel.pkgGroupExtension',
        children: [
          {
            id: 'authoring',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgTexAuthoring',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'configuration',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgTexConfiguration',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'mechanism',
            label: 'kernel.pkgTexMechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', capability: 'kernel.tex' },
          },
          {
            id: 'api-reference',
            label: 'kernel.pkgTexApiReference',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'kernel.tex.api',
              sourceOfTruth: 'runtime',
            },
          },
        ],
      },
      {
        id: 'inspect',
        label: 'kernel.pkgInspect',
        sidebarGroup: 'kernel.pkgGroupExtension',
        children: [
          {
            id: 'builtins',
            meta: { pageType: 'guide', audience: 'user' },
            label: 'kernel.pkgInspectBuiltins',
            difficulty: DocDifficulty.Beginner,
          },
          {
            id: 'custom',
            label: 'kernel.pkgInspectCustom',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.inspect'),
          },
          { id: 'mechanism', label: 'kernel.pkgInspectMechanism', difficulty: DocDifficulty.Internals },
          {
            id: 'api-reference',
            label: 'kernel.pkgInspectApiReference',
            meta: {
              pageType: 'reference',
              audience: 'integrator',
              capability: 'kernel.inspect.api',
              sourceOfTruth: 'runtime',
            },
          },
          { id: 'schema-reference', label: 'kernel.pkgInspectSchemaReference' },
        ],
      },
      {
        id: 'vanilla',
        label: 'kernel.pkgVanilla',
        sidebarGroup: 'kernel.pkgGroupFramework',
        children: [{ id: 'overview', label: 'kernel.pkgOverview', difficulty: DocDifficulty.Internals }],
      },
      {
        id: 'react',
        label: 'kernel.pkgReact',
        sidebarGroup: 'kernel.pkgGroupFramework',
        children: [{ id: 'overview', label: 'kernel.pkgOverview', difficulty: DocDifficulty.Internals }],
      },
      {
        id: 'render',
        label: 'kernel.pkgRender',
        sidebarGroup: 'kernel.pkgGroupRender',
        children: [
          { id: 'overview', label: 'kernel.pkgOverview', difficulty: DocDifficulty.Internals },
          { id: 'svg', label: 'kernel.pkgRenderSvg', difficulty: DocDifficulty.Internals },
          { id: 'canvas', label: 'kernel.pkgRenderCanvas', difficulty: DocDifficulty.Internals },
          { id: 'hydration', label: 'kernel.pkgHydration', difficulty: DocDifficulty.Internals },
        ],
      },
    ],
  },
  {
    id: 'galleries',
    label: 'kernel.gallery',
    navigationDescription: 'kernel.galleryNavigationDescription',
    document: true,
    pages: [
      { id: 'karl-circle', label: 'kernel.galleryKarlCircle', difficulty: DocDifficulty.Beginner },
      { id: 'learning-path', label: 'kernel.galleryLearningPath', difficulty: DocDifficulty.Advanced },
      { id: 'ohms-law-circuit', label: 'kernel.galleryOhmsLawCircuit', difficulty: DocDifficulty.Advanced },
    ],
  },
];
