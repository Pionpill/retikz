import type {
  CompositeCoreProviderKey,
  CoreDependencyProvider,
  IRChild,
  IRScope,
  LayoutProposal,
  ThemeStyleDefinition,
} from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  resolveCoreProviderDependencies,
} from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import { FlexLayoutProvider } from '@retikz/layout';
import { LegendProvider, SurfaceProvider } from '@retikz/standard/presentation';
import { literal } from 'zod';

import type { DiagramDefinitionOptions, ResolvedDiagramDefinitionOptions } from '../src/_diagram';
import {
  DiagramDefaultsSchema,
  DiagramFrameSchema,
  DiagramPresentationSchema,
  lowerDiagramFoundation,
  resolveDiagramDefinitionOptions,
  resolveDiagramFoundation,
} from '../src/_diagram';

const TestDiagramFoundationSchema = CompositeBaseSchema.extend({
  namespace: literal('diagram-test'),
  type: literal('foundation'),
  presentation: DiagramPresentationSchema.optional(),
  frame: DiagramFrameSchema.optional(),
  diagramDefaults: DiagramDefaultsSchema.optional(),
  drawing: ChildSchema,
});

const TestDiagramFoundationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: 'diagram-test',
  type: 'foundation',
});

const createTestDiagramFoundationDefinition = (
  options: ResolvedDiagramDefinitionOptions,
  proposal: LayoutProposal | undefined,
) => {
  return defineComposite({
    namespace: 'diagram-test',
    type: 'foundation',
    schema: TestDiagramFoundationSchema,
    compile: (source, context) => {
      const resolution = resolveDiagramFoundation(
        {
          ...(source.presentation === undefined ? {} : { presentation: source.presentation }),
          ...(source.frame === undefined ? {} : { frame: source.frame }),
          ...(source.diagramDefaults === undefined ? {} : { diagramDefaults: source.diagramDefaults }),
        },
        { theme: context.theme, diagramThemeStyles: options.diagramThemeStyles },
      );
      const surface = lowerDiagramFoundation(resolution, source.drawing);
      const result = context.layoutChild(surface, proposal ?? context.proposal);
      if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);

      return { children: [context.replay(result.result)] };
    },
  });
};

const createTestDiagramFoundationProvider = (
  options: DiagramDefinitionOptions,
  proposal: LayoutProposal | undefined,
): CoreDependencyProvider => {
  const resolved = resolveDiagramDefinitionOptions(options);
  return Object.freeze({
    key: TestDiagramFoundationProviderKey,
    dependencies: Object.freeze([FlexLayoutProvider.key, SurfaceProvider.key, LegendProvider.key]),
    datasets: Object.freeze({}),
    makeDefinition: () => createTestDiagramFoundationDefinition(resolved, proposal),
  });
};

type TestFoundationSource = Readonly<{
  presentation?: ReturnType<typeof DiagramPresentationSchema.parse>;
  frame?: ReturnType<typeof DiagramFrameSchema.parse>;
  diagramDefaults?: ReturnType<typeof DiagramDefaultsSchema.parse>;
  drawing: IRChild;
}>;

type TestFoundationHost = Pick<IRScope, 'theme' | 'defaults' | 'clip'>;

/** test-only Foundation compile 选项 */
export type TestFoundationCompileOptions = Readonly<{
  /** 测试宿主作用域的主题、默认值与裁剪输入 */
  host?: TestFoundationHost;
  /** 用于构造 Foundation provider 的定义选项 */
  diagram?: DiagramDefinitionOptions;
  /** 测试编译使用的 Core 主题样式定义 */
  themeStyles?: ReadonlyArray<ThemeStyleDefinition>;
  /** 注入 Foundation 测量过程的布局提案 */
  proposal?: LayoutProposal;
}>;

/** 通过真实 provider closure 编译 package-internal Diagram Foundation */
export const compileTestDiagramFoundation = (
  source: TestFoundationSource,
  options: TestFoundationCompileOptions = {},
) => {
  const provider = createTestDiagramFoundationProvider(options.diagram ?? {}, options.proposal);
  const definitions = resolveCoreProviderDependencies({
    contributions: [
      {
        roots: [TestDiagramFoundationProviderKey],
        providers: [provider, FlexLayoutProvider, SurfaceProvider, LegendProvider, PathClipProvider],
      },
    ],
  });
  const root: IRChild = TestDiagramFoundationSchema.parse({
    namespace: 'diagram-test',
    type: 'foundation',
    ...source,
  });
  const child: IRChild = options.host === undefined ? root : { type: 'scope', ...options.host, children: [root] };

  return compileToScene(
    { version: 1, type: 'scene', children: [child] },
    {
      ...definitions,
      themeStyles: options.themeStyles,
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
    },
  );
};
