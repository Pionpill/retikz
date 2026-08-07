import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  AnyCompositeDefinition,
  IRChild,
  IRScene,
  LayoutCompositeCompileContext,
  ResolvedTheme,
  ScenePrimitive,
} from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineThemeTokenNamespace,
  LayoutChildProbeKind,
  lowerIRToKernel,
  NaturalLayoutProposal,
  ThemeMode,
  ThemeStyle,
} from '../../src';

const sceneOf = (children: Array<IRChild>, theme?: IRScene['theme']): IRScene => ({
  type: 'scene',
  version: 1,
  ...(theme === undefined ? {} : { theme }),
  children,
});

const themeTokenDefinition = defineThemeTokenNamespace({
  namespace: 'theme-test',
  schema: z.strictObject({
    'shared.value': z.string().optional(),
    'scene.only': z.string().optional(),
    'scope.only': z.string().optional(),
    'inner.only': z.string().optional(),
    bad: z.unknown().optional(),
  }),
});

const accessorTokenObject = (): Record<string, unknown> => {
  const tokens: Record<string, unknown> = {};
  Object.defineProperty(tokens, 'bad', {
    enumerable: true,
    get: () => '#123456',
  });
  return tokens;
};

const createExpandProbe = (observed: Array<ResolvedTheme>) =>
  defineComposite({
    namespace: 'theme-test',
    type: 'expand',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('theme-test'),
      type: z.literal('expand'),
      id: z.string().optional(),
    }),
    expand: (node, context) => {
      observed.push(context.theme);
      return {
        type: 'node',
        ...(node.id === undefined ? {} : { id: node.id }),
        position: [0, 0],
        fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee',
      };
    },
  });

const createLayoutProbe = (observed: Array<ResolvedTheme>) =>
  defineComposite({
    namespace: 'theme-test',
    type: 'layout',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('theme-test'),
      type: z.literal('layout'),
    }),
    compile: (_node, context) => {
      observed.push(context.theme);
      return { children: [] };
    },
  });

describe('Theme compile context', () => {
  it('按 namespace 与 token key 合并 Scene / Scope，并为 occurrence 派生 detached shared colors', () => {
    const observed: Array<ResolvedTheme> = [];
    const sceneTheme = {
      tokens: {
        core: { 'semantic.warning': '#f59e0b' },
        'theme-test': { 'shared.value': 'scene', 'scene.only': 'yes' },
      },
    } as const;
    const scopeTheme = {
      tokens: {
        'theme-test': { 'shared.value': 'outer', 'scope.only': 'yes' },
      },
    } as const;
    const innerTheme = {
      tokens: {
        'theme-test': { 'shared.value': 'inner', 'inner.only': 'yes' },
      },
    } as const;

    compileToScene(
      sceneOf(
        [
          {
            type: 'scope',
            theme: scopeTheme,
            children: [
              {
                type: 'scope',
                theme: innerTheme,
                children: [{ namespace: 'theme-test', type: 'expand' }],
              },
            ],
          },
        ],
        sceneTheme,
      ),
      {
        composites: [createExpandProbe(observed)],
        themeTokenDefinitions: [themeTokenDefinition],
      },
    );

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      tokens: {
        core: { 'semantic.warning': '#f59e0b' },
        'theme-test': {
          'shared.value': 'inner',
          'scene.only': 'yes',
          'scope.only': 'yes',
          'inner.only': 'yes',
        },
      },
      colors: { semantic: { warning: '#f59e0b' } },
    });
    expect(Object.isFrozen(observed[0])).toBe(true);
    expect(Object.isFrozen(observed[0]?.tokens)).toBe(true);
    expect(Object.isFrozen(observed[0]?.tokens['theme-test'])).toBe(true);
    expect(Object.isFrozen(observed[0]?.colors)).toBe(true);
    expect(observed[0]?.tokens).not.toBe(sceneTheme.tokens);
  });

  it('在声明层拒绝未知 namespace 与 registered owner 的非法 sparse key', () => {
    expect(() => compileToScene(sceneOf([], { tokens: { unknown: { value: 'ignored' } } }))).toThrow(
      /scene\.theme\.tokens\.unknown/i,
    );

    expect(() =>
      compileToScene(sceneOf([], { tokens: { 'theme-test': { unknown: 'rejected' } } }), {
        themeTokenDefinitions: [themeTokenDefinition],
      }),
    ).toThrow(/scene\.theme\.tokens\.theme-test.*unknown/i);
  });

  it.each([
    ['function', { bad: () => '#123456' }],
    ['class instance', { bad: new (class ThemeTokenValue {})() }],
    ['accessor', accessorTokenObject()],
  ])('非 JSON %s token 的诊断包含声明层与结构路径', (_label, tokens) => {
    const theme = { tokens: { 'theme-test': tokens } } as unknown as IRScene['theme'];

    expect(() => compileToScene(sceneOf([], theme), { themeTokenDefinitions: [themeTokenDefinition] })).toThrow(
      /scene\.theme\.tokens\.theme-test\.bad/i,
    );
  });

  it('lowering-only 与 full compile 接受同一 theme token definition registry', () => {
    const fullThemes: Array<ResolvedTheme> = [];
    const lowerThemes: Array<ResolvedTheme> = [];
    const input = sceneOf([{ namespace: 'theme-test', type: 'expand' }], {
      tokens: { 'theme-test': { 'shared.value': 'lowerable' } },
    });
    const definitions = [themeTokenDefinition];

    compileToScene(input, {
      composites: [createExpandProbe(fullThemes)],
      themeTokenDefinitions: definitions,
    });
    const lowered = lowerIRToKernel(input, {
      composites: [createExpandProbe(lowerThemes)],
      themeTokenDefinitions: definitions,
    });

    expect(lowerThemes).toEqual(fullThemes);
    expect(lowered.theme).toEqual(input.theme);
  });

  it('默认向 expand 与 layout-aware Composite 提供冻结的 neutral + light', () => {
    const expandThemes: Array<ResolvedTheme> = [];
    const layoutThemes: Array<ResolvedTheme> = [];
    const definitions = [createExpandProbe(expandThemes), createLayoutProbe(layoutThemes)] as const;

    compileToScene(
      sceneOf([
        { namespace: 'theme-test', type: 'expand' },
        { namespace: 'theme-test', type: 'layout' },
      ]),
      { composites: definitions },
    );

    expect(expandThemes[0]).toMatchObject({ style: 'neutral', mode: 'light', tokens: {} });
    expect(layoutThemes[0]).toMatchObject({ style: 'neutral', mode: 'light', tokens: {} });
    expect(Object.isFrozen(expandThemes[0])).toBe(true);
    expect(Object.isFrozen(layoutThemes[0])).toBe(true);
  });

  it('嵌套 sparse Theme下 expand与layout-aware Composite读取同一完整值', () => {
    const expandThemes: Array<ResolvedTheme> = [];
    const layoutThemes: Array<ResolvedTheme> = [];

    compileToScene(
      sceneOf(
        [
          {
            type: 'scope',
            theme: { mode: ThemeMode.Light },
            children: [
              {
                type: 'scope',
                theme: { style: ThemeStyle.Vibrant },
                children: [
                  { namespace: 'theme-test', type: 'expand' },
                  { namespace: 'theme-test', type: 'layout' },
                ],
              },
            ],
          },
        ],
        { style: ThemeStyle.Academic, mode: ThemeMode.Dark },
      ),
      { composites: [createExpandProbe(expandThemes), createLayoutProbe(layoutThemes)] },
    );

    expect(expandThemes[0]).toMatchObject({ style: 'vibrant', mode: 'light', tokens: {} });
    expect(layoutThemes).toEqual(expandThemes);
    expect(Object.isFrozen(layoutThemes[0])).toBe(true);
  });

  it('省略 sparse Theme 时直接复用父级 ResolvedTheme identity', () => {
    const observed: Array<ResolvedTheme> = [];
    const definition = createExpandProbe(observed);

    compileToScene(
      sceneOf([
        { namespace: 'theme-test', type: 'expand' },
        {
          type: 'scope',
          children: [
            { namespace: 'theme-test', type: 'expand' },
            {
              type: 'scope',
              children: [{ namespace: 'theme-test', type: 'expand' }],
            },
          ],
        },
      ]),
      { composites: [definition] },
    );

    expect(observed).toHaveLength(3);
    expect(observed[1]).toBe(observed[0]);
    expect(observed[2]).toBe(observed[0]);
  });

  it('按 default → Scene → outer Scope → inner Scope逐字段继承且不受 resetStyle影响', () => {
    const observed: Array<ResolvedTheme> = [];
    const definition = createExpandProbe(observed);

    compileToScene(
      sceneOf(
        [
          { namespace: 'theme-test', type: 'expand', id: 'root' },
          {
            type: 'scope',
            theme: { mode: ThemeMode.Light },
            resetStyle: true,
            children: [
              { namespace: 'theme-test', type: 'expand', id: 'outer' },
              {
                type: 'scope',
                theme: { style: ThemeStyle.Vibrant },
                children: [{ namespace: 'theme-test', type: 'expand', id: 'inner' }],
              },
            ],
          },
        ],
        { style: ThemeStyle.Academic, mode: ThemeMode.Dark },
      ),
      { composites: [definition] },
    );

    expect(observed).toEqual([
      expect.objectContaining({ style: 'academic', mode: 'dark', tokens: {} }),
      expect.objectContaining({ style: 'academic', mode: 'light', tokens: {} }),
      expect.objectContaining({ style: 'vibrant', mode: 'light', tokens: {} }),
    ]);
  });

  it('full compile 与 lowering-only 对 expand 使用同一继承语义', () => {
    const fullThemes: Array<ResolvedTheme> = [];
    const lowerThemes: Array<ResolvedTheme> = [];
    const input = sceneOf(
      [
        {
          type: 'scope',
          theme: { mode: ThemeMode.Dark },
          children: [{ namespace: 'theme-test', type: 'expand' }],
        },
      ],
      { style: ThemeStyle.Clean },
    );

    const full = compileToScene(input, { composites: [createExpandProbe(fullThemes)], padding: 0 });
    const lowered = lowerIRToKernel(input, { composites: [createExpandProbe(lowerThemes)] });
    const loweredCompiled = compileToScene(lowered, { padding: 0 });

    expect(fullThemes[0]).toMatchObject({ style: 'clean', mode: 'dark', tokens: {} });
    expect(lowerThemes).toEqual(fullThemes);
    expect(loweredCompiled.scene).toEqual(full.scene);
  });

  it('Composite 普通输出 Scope与 runtime Scope建立更内层 Theme', () => {
    const observed: Array<ResolvedTheme> = [];
    const leaf = createExpandProbe(observed);
    const ordinary = defineComposite({
      namespace: 'theme-test',
      type: 'ordinary-scope',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('ordinary-scope'),
      }),
      expand: () => ({
        type: 'scope',
        theme: { mode: ThemeMode.Dark },
        children: [{ namespace: 'theme-test', type: 'expand' }],
      }),
    });
    const runtime = defineComposite({
      namespace: 'theme-test',
      type: 'runtime-scope',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('runtime-scope'),
      }),
      compile: (_node, context) => ({
        children: [
          context.scope({ theme: { style: ThemeStyle.Vibrant } }, [{ namespace: 'theme-test', type: 'expand' }]),
        ],
      }),
    });

    compileToScene(
      sceneOf(
        [
          { namespace: 'theme-test', type: 'ordinary-scope' },
          { namespace: 'theme-test', type: 'runtime-scope' },
        ],
        { style: ThemeStyle.Academic, mode: ThemeMode.Light },
      ),
      { composites: [ordinary, runtime, leaf] },
    );

    expect(observed).toEqual([
      expect.objectContaining({ style: 'academic', mode: 'dark', tokens: {} }),
      expect.objectContaining({ style: 'vibrant', mode: 'light', tokens: {} }),
    ]);
  });

  it('probe继承调用点 Theme，replay不被提交位置 runtime Scope重解释', () => {
    const observed: Array<ResolvedTheme> = [];
    const leaf = createExpandProbe(observed);
    const owner = defineComposite({
      namespace: 'theme-test',
      type: 'probe-owner',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('probe-owner'),
      }),
      compile: (_node, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            theme: { mode: ThemeMode.Dark },
            children: [{ namespace: 'theme-test', type: 'expand' }],
          },
          NaturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return {
          children: [context.scope({ theme: { mode: ThemeMode.Light } }, [context.replay(probe.result)])],
        };
      },
    });

    compileToScene(sceneOf([{ namespace: 'theme-test', type: 'probe-owner' }]), {
      composites: [owner, leaf],
    });

    expect(observed[0]).toMatchObject({ style: 'neutral', mode: 'dark', tokens: {} });
  });

  it('runtime Scope Theme 在 replay child 上沿 Core probe/replay channel 生效', () => {
    const leaf = defineComposite({
      namespace: 'theme-test',
      type: 'runtime-theme-leaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('runtime-theme-leaf'),
      }),
      compile: (_node, context) => ({
        children: [
          {
            type: 'node',
            position: [0, 0],
            fill: context.theme.mode === ThemeMode.Dark ? '#111111' : '#eeeeee',
          },
        ],
      }),
    });
    const owner = defineComposite({
      namespace: 'theme-test',
      type: 'runtime-theme-owner',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('runtime-theme-owner'),
      }),
      compile: (_node, context) => {
        const probe = context.layoutChild(
          { namespace: 'theme-test', type: 'runtime-theme-leaf' },
          NaturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.scope({ theme: { mode: ThemeMode.Dark } }, [context.replay(probe.result)])] };
      },
    });

    const result = compileToScene(sceneOf([{ namespace: 'theme-test', type: 'runtime-theme-owner' }]), {
      composites: [leaf, owner],
      padding: 0,
    });
    const hasDarkFill = (primitives: ReadonlyArray<ScenePrimitive>): boolean =>
      primitives.some(primitive =>
        primitive.type === 'group'
          ? hasDarkFill(primitive.children)
          : primitive.type === 'rect' && primitive.fill === '#111111',
      );

    expect(hasDarkFill(result.scene.primitives)).toBe(true);
  });

  it('Core-only 图元与最终 Scene不携带或解释 Theme', () => {
    const plain = sceneOf([{ type: 'node', id: 'n', position: [0, 0], fill: '#abcdef' }]);
    const themed = { ...plain, theme: { style: ThemeStyle.Vibrant, mode: ThemeMode.Dark } } satisfies IRScene;

    const plainScene = compileToScene(plain).scene;
    const themedScene = compileToScene(themed).scene;

    expect(themedScene).toEqual(plainScene);
    expect(JSON.stringify(themedScene)).not.toContain('theme');
    expect(JSON.stringify(themedScene)).not.toContain('vibrant');
  });

  it('runtime Scope拒绝非法 Theme并保留 Composite contract诊断', () => {
    const invalidRuntime = defineComposite({
      namespace: 'theme-test',
      type: 'invalid-runtime',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('invalid-runtime'),
      }),
      compile: (_node, context: LayoutCompositeCompileContext) => ({
        children: [context.scope({ theme: { mode: 'system' } } as never, [])],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'theme-test', type: 'invalid-runtime' }]), {
        composites: [invalidRuntime],
      }),
    ).toThrow(/theme-test\.invalid-runtime.*runtime Scope theme\.mode/i);
  });

  it('runtime Scope未知 Theme字段的诊断包含具体字段', () => {
    const invalidRuntime = defineComposite({
      namespace: 'theme-test',
      type: 'unknown-runtime-theme',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('unknown-runtime-theme'),
      }),
      compile: (_node, context: LayoutCompositeCompileContext) => ({
        children: [context.scope({ theme: { palette: 'paper' } } as never, [])],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'theme-test', type: 'unknown-runtime-theme' }]), {
        composites: [invalidRuntime],
      }),
    ).toThrow(/runtime Scope theme\.palette/i);
  });

  it('lowering-only非法 expand Scope Theme诊断包含 expansion locator与具体字段', () => {
    const invalidExpand = defineComposite({
      namespace: 'theme-test',
      type: 'invalid-expand-theme',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('invalid-expand-theme'),
      }),
      expand: () =>
        ({
          type: 'scope',
          theme: { mode: 'system' },
          children: [],
        }) as never,
    });

    expect(() =>
      lowerIRToKernel(sceneOf([{ namespace: 'theme-test', type: 'invalid-expand-theme' }]), {
        composites: [invalidExpand],
      }),
    ).toThrow(/children\[0\]::expand\[0\]\.theme\.mode/i);
  });

  it('完整编译非法 expand Scope Theme诊断保留嵌套 expansion locator', () => {
    const invalidLeaf = defineComposite({
      namespace: 'theme-test',
      type: 'invalid-expand-leaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('invalid-expand-leaf'),
      }),
      expand: () => [
        { type: 'node', position: [0, 0] },
        {
          type: 'scope',
          theme: { mode: 'system' },
          children: [],
        } as never,
      ],
    });
    const invalidNested = defineComposite({
      namespace: 'theme-test',
      type: 'invalid-expand-nested',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('invalid-expand-nested'),
      }),
      expand: () => [
        { type: 'node', position: [0, 0] },
        {
          type: 'scope',
          children: [
            { type: 'node', position: [0, 0] },
            { namespace: 'theme-test', type: 'invalid-expand-leaf' },
          ],
        },
      ],
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'theme-test', type: 'invalid-expand-leaf' }]), {
        composites: [invalidLeaf],
      }),
    ).toThrow(/children\[0\]::expand\[1\]\.scope\.theme\.mode/i);

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'theme-test', type: 'invalid-expand-nested' }]), {
        composites: [invalidLeaf, invalidNested],
      }),
    ).toThrow(/children\[0\]::expand\[1\]::scopeChild\[1\]::expand\[1\]\.scope\.theme\.mode/i);
  });

  it('未知 Theme字段在各编译入口都包含具体字段 locator', () => {
    const invalidExpand = defineComposite({
      namespace: 'theme-test',
      type: 'unknown-expand-theme',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('unknown-expand-theme'),
      }),
      expand: () =>
        ({
          type: 'scope',
          theme: { palette: 'paper' },
          children: [],
        }) as never,
    });
    const root = {
      type: 'scene',
      version: 1,
      theme: { palette: 'paper' },
      children: [],
    } as never;
    const scoped = sceneOf([
      {
        type: 'scope',
        theme: { palette: 'paper' },
        children: [],
      } as never,
    ]);
    const expanded = sceneOf([{ namespace: 'theme-test', type: 'unknown-expand-theme' }]);

    expect(() => compileToScene(root)).toThrow(/scene\.theme\.palette/i);
    expect(() => compileToScene(scoped)).toThrow(/children\[0\]\.scope\.theme\.palette/i);
    expect(() => compileToScene(expanded, { composites: [invalidExpand] })).toThrow(
      /children\[0\]::expand\[0\]\.scope\.theme\.palette/i,
    );
    expect(() => lowerIRToKernel(expanded, { composites: [invalidExpand] })).toThrow(
      /children\[0\]::expand\[0\]\.theme\.palette/i,
    );
  });

  it('非法 Scene与普通 Scope Theme诊断包含对应 IR locator', () => {
    expect(() =>
      compileToScene({
        type: 'scene',
        version: 1,
        theme: { style: 'paper' },
        children: [],
      } as never),
    ).toThrow(/scene\.theme\.style/i);

    expect(() =>
      compileToScene({
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            theme: { mode: 'system' },
            children: [],
          },
        ],
      } as never),
    ).toThrow(/children\[0\]\.scope\.theme\.mode/i);
  });

  it('lowering-only遇到 layout-aware definition时仍在 callback前 fail-loud', () => {
    const compile = vi.fn(() => ({ children: [] }));
    const definition = defineComposite({
      namespace: 'theme-test',
      type: 'layout-only',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('theme-test'),
        type: z.literal('layout-only'),
      }),
      compile,
    });

    expect(() =>
      lowerIRToKernel(sceneOf([{ namespace: 'theme-test', type: 'layout-only' }]), {
        composites: [definition] as ReadonlyArray<AnyCompositeDefinition>,
      }),
    ).toThrow(/full compile environment/i);
    expect(compile).not.toHaveBeenCalled();
  });
});
