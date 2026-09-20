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
            id: 'extend',
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
          {
            id: 'usage',
            label: 'kernel.nodeUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'extend',
            label: 'kernel.nodePositioning',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'labels',
            label: 'kernel.nodeLabels',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'shape',
            label: 'kernel.nodeShape',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'text',
            label: 'kernel.nodeText',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'coordinate',
            label: 'kernel.nodeCoordinate',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'custom-shape',
            label: 'kernel.nodeCustomShape',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.shape'),
          },
          {
            id: 'custom',
            label: 'kernel.nodeCustom',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.boundary'),
          },
          { id: 'mechanism', label: 'kernel.nodeMechanism', difficulty: DocDifficulty.Internals },
          {
            id: 'api-reference',
            label: 'kernel.nodeApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.nodeSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'path',
        label: 'kernel.path',
        sidebarGroup: 'kernel.components',
        children: [
          {
            id: 'usage',
            label: 'kernel.pathUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'draw',
            label: 'kernel.draw',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'step',
            label: 'kernel.step',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'arrow',
            label: 'kernel.arrow',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'label',
            label: 'kernel.pathLabel',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user' },
          },
          {
            id: 'custom-path-generator',
            label: 'kernel.pathGenerator',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.path-generator'),
          },
          {
            id: 'custom-path',
            label: 'kernel.pathCustomPath',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.path-kind'),
          },
          {
            id: 'custom-arrow',
            label: 'kernel.pathCustomArrow',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.arrow'),
          },
          { id: 'mechanism', label: 'kernel.pathMechanism', difficulty: DocDifficulty.Internals },
          {
            id: 'api-reference',
            label: 'kernel.pathApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.pathSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
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
    id: 'visual',
    label: 'kernel.visual',
    navigationDescription: 'kernel.visualNavigationDescription',
    pages: [
      {
        id: 'pattern',
        label: 'kernel.effectsPattern',
        sidebarGroup: 'kernel.visual',
        meta: { pageType: 'group', audience: 'user' },
        children: [
          {
            id: 'usage',
            label: 'kernel.visualUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'integration',
            label: 'kernel.visualIntegration',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'custom-pattern',
            label: 'kernel.visualCustomPattern',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.pattern'),
          },
          {
            id: 'mechanism',
            label: 'kernel.visualMechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime' },
          },
          {
            id: 'api-reference',
            label: 'kernel.visualApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.visualSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'schema' },
          },
        ],
      },
      {
        id: 'shadow',
        label: 'kernel.effectsShadow',
        sidebarGroup: 'kernel.visual',
        meta: { pageType: 'group', audience: 'user' },
        children: [
          {
            id: 'usage',
            label: 'kernel.visualUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'integration',
            label: 'kernel.visualIntegration',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'mechanism',
            label: 'kernel.visualMechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime' },
          },
          {
            id: 'api-reference',
            label: 'kernel.visualApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.visualSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'schema' },
          },
        ],
      },
      {
        id: 'blend',
        label: 'kernel.effectsBlend',
        sidebarGroup: 'kernel.visual',
        meta: { pageType: 'group', audience: 'user' },
        children: [
          {
            id: 'usage',
            label: 'kernel.visualUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'integration',
            label: 'kernel.visualIntegration',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'mechanism',
            label: 'kernel.visualMechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime' },
          },
          {
            id: 'api-reference',
            label: 'kernel.visualApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
        ],
      },
      {
        id: 'animation',
        label: 'kernel.effectsAnimation',
        sidebarGroup: 'kernel.visual',
        meta: { pageType: 'group', audience: 'user' },
        children: [
          {
            id: 'usage',
            label: 'kernel.visualUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'integration',
            label: 'kernel.visualIntegration',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'extended-usage',
            label: 'kernel.visualExtendedUsage',
            difficulty: DocDifficulty.Beginner,
            meta: { pageType: 'guide', audience: 'user', sourceOfTruth: 'runtime' },
          },
          {
            id: 'custom-animation',
            label: 'kernel.visualCustomAnimation',
            difficulty: DocDifficulty.Advanced,
            meta: extensionGuide('kernel.animation'),
          },
          {
            id: 'mechanism',
            label: 'kernel.visualMechanism',
            difficulty: DocDifficulty.Internals,
            meta: { pageType: 'guide', audience: 'maintainer', sourceOfTruth: 'runtime' },
          },
          {
            id: 'api-reference',
            label: 'kernel.visualApiReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'runtime' },
          },
          {
            id: 'schema-reference',
            label: 'kernel.visualSchemaReference',
            meta: { pageType: 'reference', audience: 'integrator', sourceOfTruth: 'schema' },
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
          { id: 'schema-reference', label: 'kernel.pkgFoundationSchemaReference' },
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
    pages: [
      { id: 'karl-circle', label: 'kernel.galleryKarlCircle', difficulty: DocDifficulty.Beginner },
      { id: 'learning-path', label: 'kernel.galleryLearningPath', difficulty: DocDifficulty.Advanced },
      { id: 'ohms-law-circuit', label: 'kernel.galleryOhmsLawCircuit', difficulty: DocDifficulty.Advanced },
    ],
  },
];
