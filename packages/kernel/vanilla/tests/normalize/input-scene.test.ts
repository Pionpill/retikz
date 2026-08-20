import type { AnyCompositeDefinition, IRPath } from '@retikz/core';

import { CompositeBaseSchema, DEFAULT_RESOLVED_THEME, defineComposite, ThemeMode } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { InputChild, InputEmbedAdapter, InputScene } from '../../src';

import { embed, InputLayerCache, layer, node, normalizeScene, path, scene, scope } from '../../src';

const EMPTY_COMPOSITE_DEPENDENCIES = Object.freeze({ roots: [], providers: [] });

const boxComposite = defineComposite({
  namespace: 'fixture',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('fixture'),
    type: z.literal('box'),
    text: z.string(),
  }),
  expand: composite => ({
    children: [
      {
        type: 'node',
        id: `fixture-${composite.text}`,
        position: [0, 0],
        shape: 'rectangle',
        text: composite.text,
      },
    ],
  }),
});

const createBoxAdapter = (
  makeDefinition = vi.fn<(datasets: Readonly<Record<string, unknown>>) => AnyCompositeDefinition>(() => boxComposite),
): InputEmbedAdapter<{ text: string; data: object }> => ({
  kind: 'fixture-box',
  lower: props => ({
    node: { namespace: 'fixture', type: 'box', text: props.text },
    providerDependencies: {
      roots: [{ capability: 'composite', namespace: 'fixture', type: 'box' }],
      providers: [
        {
          key: { capability: 'composite', namespace: 'fixture', type: 'box' },
          dependencies: [],
          datasets: { shared: props.data },
          makeDefinition,
        },
      ],
    },
  }),
});

describe('@retikz/vanilla InputScene', () => {
  it('scene/path helper 只构造 Input，不提前解析 path grammar', () => {
    const input = scene({
      layers: [
        layer('main', [
          node('source', { position: [0, 0] }),
          path('edge', { way: ['source', [24, 0]], thickness: 'thick' }),
        ]),
      ],
    });

    expect(input).toMatchObject({
      type: 'scene',
      layers: [
        {
          id: 'main',
          children: [
            { type: 'node', id: 'source' },
            { id: 'edge', way: ['source', [24, 0]], thickness: 'thick' },
          ],
        },
      ],
    });
    expect(input).not.toHaveProperty('version');
  });

  it('InputScene 的 children 简写归一为唯一 IR 与默认 Layer metadata', () => {
    const input: InputScene = { children: [{ id: 'node', position: [0, 0] }] };

    expect(normalizeScene(input)).toMatchObject({
      ir: {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'node', position: [0, 0] }],
      },
      contributions: [],
      runtimeMeta: {
        layers: [{ id: 'default', cache: 'auto', order: 0, zIndex: 0, childIds: ['node'] }],
      },
    });
  });

  it('省略 type 的 Path Input 仍由 Vanilla 归一为路径 IR', () => {
    const input: InputScene = {
      children: [
        {
          way: [
            [0, 0],
            [24, 0],
          ],
        },
      ],
    };

    expect(normalizeScene(input).ir.children).toEqual([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
      },
    ]);
  });

  it('省略 type 的 Scope Input 仍由 Vanilla 归一为 Scope IR', () => {
    const input: InputScene = {
      children: [{ transforms: [], children: [{ id: 'nested', position: [0, 0] }] }],
    };

    expect(normalizeScene(input).ir.children).toEqual([
      {
        type: 'scope',
        transforms: [],
        children: [{ type: 'node', id: 'nested', position: [0, 0] }],
      },
    ]);
  });

  it('直接传入的 Core Path 保持原有步骤语义，不进入 InputPath 归一化', () => {
    const corePath: IRPath = {
      type: 'path',
      children: [
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    };

    expect(normalizeScene({ children: [corePath] }).ir.children[0]).toBe(corePath);
  });

  it('localNamespace InputScope 允许遮蔽外层 identity', () => {
    expect(
      normalizeScene(
        scene([node('A', { position: [0, 0] }), scope({ localNamespace: true }, [node('A', { position: [20, 0] })])]),
      ).ir.children,
    ).toEqual([
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'scope', localNamespace: true, children: [{ type: 'node', id: 'A', position: [20, 0] }] },
    ]);
  });

  it('空 children 的省略 type Input 必须显式声明 Scope，避免错误归类', () => {
    const ambiguous: InputScene = {
      children: [{ children: [] }],
    };

    expect(() => normalizeScene(ambiguous)).toThrow(/empty children array must declare type/i);
    expect(
      normalizeScene({
        children: [{ type: 'scope', children: [] }],
      }).ir.children,
    ).toEqual([{ type: 'scope', children: [] }]);
  });

  it('默认 Layer identity 不占用公开 child identity', () => {
    expect(normalizeScene(scene([node('default', { position: [0, 0] })])).ir.children).toEqual([
      { type: 'node', id: 'default', position: [0, 0] },
    ]);
  });

  it('Layer 按 zIndex 与声明顺序稳定合并，缓存提示不写入 Core IR', () => {
    const normalized = normalizeScene(
      scene({
        layers: [
          layer('top', { zIndex: 10, cache: InputLayerCache.Dynamic }, [node('top-node', { position: [10, 0] })]),
          layer('background', { cache: InputLayerCache.Static }, [node('base', { position: [0, 0] })]),
        ],
      }),
    );

    expect(normalized.ir.children.map(child => child.id)).toEqual(['base', 'top-node']);
    expect(normalized.runtimeMeta.layers.map(entry => [entry.id, entry.cache, entry.zIndex])).toEqual([
      ['background', InputLayerCache.Static, 0],
      ['top', InputLayerCache.Dynamic, 10],
    ]);
    expect(JSON.stringify(normalized.ir)).not.toContain('static');
  });

  it('normalizeScene 解析 path shorthand，并遵守显式 strokeWidth 优先级', () => {
    const normalized = normalizeScene(
      scene([
        path('edge', {
          way: [
            [0, 0],
            [24, 0],
          ],
          thickness: 'thick',
          strokeWidth: 0,
        }),
      ]),
    );

    expect(normalized.ir.children).toEqual([
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
        strokeWidth: 0,
      },
    ]);
  });

  it('Path arrow authoring 由 Vanilla normalizer 统一收敛为 marks', () => {
    const arrowPath = {
      type: 'path' as const,
      id: 'edge',
      way: [
        [0, 0],
        [24, 0],
      ] as const,
      arrow: '<->' as const,
      arrowDetail: {
        shape: 'stealth',
        color: '#2563eb',
        start: { color: '#dc2626' },
      },
    };

    expect(normalizeScene(scene([arrowPath])).ir.children).toEqual([
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
        marks: [
          { pos: 0, mark: { kind: 'arrow', shape: 'stealth', color: '#dc2626' } },
          { pos: 1, mark: { kind: 'arrow', shape: 'stealth', color: '#2563eb' } },
        ],
      },
    ]);
  });

  it('authoring provenance 不进入 Core IR', () => {
    const authoring = Object.freeze({ extension: 'fixture' });
    const normalized = normalizeScene(
      scene({
        authoring,
        children: [
          scope({ authoring }, [
            path('curve', {
              authoring,
              way: [
                [0, 0],
                [30, 10],
              ],
            }),
          ]),
        ],
      }),
    );

    expect(normalized.authoringSites.map(site => site.authoring)).toEqual([authoring, authoring, authoring]);
    expect(JSON.stringify(normalized.ir)).not.toContain('authoring');
  });

  it('embed normalizer 只收集 contribution，不调用 provider maker', () => {
    const makeDefinition = vi.fn(() => boxComposite);
    const adapter = createBoxAdapter(makeDefinition);
    const normalized = normalizeScene(scene([embed('fixture-box', 'box', { text: 'A', data: { rows: [1] } })]), {
      adapters: [adapter],
    });

    expect(normalized.ir.children).toEqual([{ namespace: 'fixture', type: 'box', text: 'A' }]);
    expect(normalized.contributions).toHaveLength(1);
    expect(makeDefinition).not.toHaveBeenCalled();
  });

  it('adapter 输出身份纳入 runtime metadata', () => {
    const adapter: InputEmbedAdapter<{ label: string }> = {
      kind: 'named-output',
      lower: props => ({
        node: {
          type: 'scope',
          id: 'chart/root',
          children: [{ type: 'node', id: 'chart/label', position: [0, 0], text: props.label }],
        },
        providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
      }),
    };

    const normalized = normalizeScene(
      scene({ layers: [layer('main', [embed('named-output', 'chart', { label: 'A' })])] }),
      { adapters: [adapter] },
    );

    expect(normalized.runtimeMeta.identityIndex.get('chart')).toEqual(['main', 'chart']);
    expect(normalized.runtimeMeta.identityIndex.get('chart/root')).toEqual(['main', 'chart', 'chart/root']);
    expect(normalized.runtimeMeta.parentIndex.get('chart/label')).toBe('chart/root');

    const wrappedAdapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'wrapped-output',
      lower: (_props, context) => ({
        node: {
          type: 'scope',
          children: [{ type: 'node', id: context.id, position: [0, 0] }],
        },
        providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
      }),
    };

    const wrapped = normalizeScene(scene([embed('wrapped-output', 'chart', {})]), { adapters: [wrappedAdapter] });

    expect(wrapped.ir.children).toEqual([
      { type: 'scope', children: [{ type: 'node', id: 'chart', position: [0, 0] }] },
    ]);
    expect(wrapped.runtimeMeta.identityIndex.get('chart')).toEqual(['default', 'chart']);
  });

  it('embed slot 与根 Scene 共享公开 identity 索引', () => {
    const slotAdapter: InputEmbedAdapter<{ slots: ReadonlyArray<ReadonlyArray<InputChild>> }> = {
      kind: 'slot-output',
      lower: (props, context) => {
        const normalizeChildren = context.normalizeChildren;
        if (normalizeChildren === undefined) throw new Error('expected embedded child normalizer');
        const slots = props.slots.map(slot => normalizeChildren(slot));
        void slots;
        return {
          node: {
            namespace: 'fixture',
            type: 'box',
            text: 'frame',
          },
          providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
        };
      },
    };
    const slotChildren = [node('shared', { position: [0, 0] })];

    expect(() =>
      normalizeScene(
        scene([embed('slot-output', 'frame', { slots: [slotChildren] }), node('shared', { position: [1, 0] })]),
        {
          adapters: [slotAdapter],
        },
      ),
    ).toThrow(/duplicate identity "shared"/i);
    expect(() =>
      normalizeScene(
        scene([node('shared', { position: [1, 0] }), embed('slot-output', 'frame', { slots: [slotChildren] })]),
        {
          adapters: [slotAdapter],
        },
      ),
    ).toThrow(/duplicate identity "shared"/i);
    expect(() =>
      normalizeScene(
        scene([embed('slot-output', 'frame', { slots: [slotChildren, [node('shared', { position: [2, 0] })]] })]),
        { adapters: [slotAdapter] },
      ),
    ).toThrow(/duplicate identity "shared"/i);
  });

  it('同一 embed 外层 identity 只能被所有 slot 合计复用一次', () => {
    const multiSlotAdapter: InputEmbedAdapter<{ slots: ReadonlyArray<ReadonlyArray<InputChild>> }> = {
      kind: 'multi-slot-output',
      lower: (props, context) => {
        const normalizeChildren = context.normalizeChildren;
        if (normalizeChildren === undefined) throw new Error('expected embedded child normalizer');
        props.slots.forEach(slot => normalizeChildren(slot));
        return {
          node: {
            namespace: 'fixture',
            type: 'box',
            text: 'frame',
          },
          providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
        };
      },
    };

    expect(() =>
      normalizeScene(
        scene([
          embed('multi-slot-output', 'outer', {
            slots: [[node('outer', { position: [0, 0] })]],
          }),
        ]),
        { adapters: [multiSlotAdapter] },
      ),
    ).not.toThrow();
    expect(() =>
      normalizeScene(
        scene([
          embed('multi-slot-output', 'outer', {
            slots: [[node('outer', { position: [0, 0] })], [node('outer', { position: [1, 0] })]],
          }),
        ]),
        { adapters: [multiSlotAdapter] },
      ),
    ).toThrow(/duplicate identity "outer"/i);
  });

  it('embed slot 的 Scope Theme 诊断路径不重复 embed 段', () => {
    const sourcePaths: Array<string> = [];
    const themeSlotAdapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'theme-slot',
      lower: (_props, context) => {
        const normalizeChildren = context.normalizeChildren;
        if (normalizeChildren === undefined) throw new Error('expected embedded child normalizer');
        normalizeChildren([scope({ theme: { mode: ThemeMode.Dark } }, [node('child', { position: [0, 0] })])]);
        return {
          node: { type: 'scope', children: [] },
          providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
        };
      },
    };

    normalizeScene(scene([embed('theme-slot', 'outer', {})]), {
      adapters: [themeSlotAdapter],
      embedThemeContext: {
        root: { theme: DEFAULT_RESOLVED_THEME },
        resolveScope: (parent, _theme, sourcePath) => {
          sourcePaths.push(sourcePath);
          return parent;
        },
      },
    });

    expect(sourcePaths).toEqual(['children[0].embed.children[0].theme']);
  });

  it('缺失 adapter 或重复 identity 时在 Input normalizer fail-loud', () => {
    expect(() => normalizeScene(scene([embed('missing', 'x', {})]))).toThrow(/adapter/i);
    expect(() => normalizeScene(scene([node('a', { position: [0, 0] }), node('a', { position: [1, 0] })]))).toThrow(
      /duplicate identity "a"/i,
    );
  });
});
