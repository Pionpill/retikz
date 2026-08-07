// @vitest-environment jsdom
import type { AnyCompositeDefinition } from '@retikz/core';

import {
  CompositeBaseSchema,
  defineComposite,
  defineThemeTokenNamespace,
  NodeTextColor,
  ThemeMode,
  ThemeStyle,
} from '@retikz/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { VanillaTier2Adapter } from '../../src';

import { embed, figure, layer, mount, node, path, renderToSvgString, scope, VanillaLayerCache } from '../../src';
import { normalizeFigureSpec } from '../../src/spec';

const boxComposite = defineComposite({
  namespace: 'fixture',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('fixture'),
    type: z.literal('box'),
    text: z.string(),
  }),
  expand: composite => ({
    type: 'node',
    id: `fixture-${composite.text}`,
    position: [0, 0],
    shape: 'rectangle',
    text: composite.text,
  }),
});

const makeAdapter = (
  makeComposites = vi.fn(() => [boxComposite]),
): VanillaTier2Adapter<{ text: string; data: object }> => ({
  kind: 'fixture-box',
  namespace: 'fixture',
  lower: props => ({
    node: { namespace: 'fixture', type: 'box', text: props.text },
    datasets: { shared: props.data },
    makeComposites,
  }),
});

const createCanvasContext = (): CanvasRenderingContext2D => {
  const target: Record<string | symbol, unknown> = {
    canvas: null,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return () => undefined;
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
};

describe('@retikz/vanilla plain spec', () => {
  class ThemeInstance {
    style = ThemeStyle.Academic;
  }

  it('embed adapter 贡献 owner Theme definition singleton 到 normalization 产物', () => {
    const definition = defineThemeTokenNamespace({
      namespace: 'vanilla-theme',
      schema: z.strictObject({ 'surface.fill': z.string().optional() }),
    });
    const makeComposites = () => [];
    const adapter: VanillaTier2Adapter<{ label: string }> = {
      kind: 'vanilla-theme',
      namespace: 'vanilla-theme',
      lower: props => ({
        node: { namespace: 'vanilla-theme', type: 'box', label: props.label },
        datasets: {},
        makeComposites,
        themeTokenDefinitions: [definition],
      }),
    };

    const normalized = normalizeFigureSpec(figure([embed('vanilla-theme', 'box', { label: 'A' })]), {
      adapters: [adapter],
    });

    expect(normalized.themeTokenDefinitions).toEqual([definition]);

    const repeated = normalizeFigureSpec(
      figure([embed('vanilla-theme', 'a', { label: 'A' }), embed('vanilla-theme', 'b', { label: 'B' })]),
      { adapters: [adapter] },
    );
    expect(repeated.themeTokenDefinitions).toEqual([definition]);
    expect(normalizeFigureSpec(figure([]), { adapters: [adapter] }).themeTokenDefinitions).toEqual([]);
  });

  it('figure helper 与 Scope 原样写入同一 Core Theme IR', () => {
    const rootTheme = { style: ThemeStyle.Academic, mode: ThemeMode.Dark };
    const spec = figure({
      theme: rootTheme,
      children: [scope({ theme: { mode: ThemeMode.Light } }, [node('inside', { position: [0, 0] })])],
    });

    expect(spec.theme).toEqual(rootTheme);
    expect(spec.theme).not.toBe(rootTheme);
    const normalized = normalizeFigureSpec(spec);
    expect(normalized.ir.theme).not.toBe(spec.theme);
    expect(normalized.ir).toEqual({
      type: 'scene',
      version: 1,
      theme: rootTheme,
      children: [
        {
          type: 'scope',
          theme: { mode: 'light' },
          children: [{ type: 'node', id: 'inside', position: [0, 0] }],
        },
      ],
    });
  });

  it('scope helper 与 normalize 都脱离嵌套 Scope Theme输入', () => {
    const localTheme = { mode: ThemeMode.Dark };
    const scoped = scope({ theme: localTheme }, [node('inside', { position: [0, 0] })]);

    expect(scoped.theme).not.toBe(localTheme);

    const normalized = normalizeFigureSpec({
      type: 'figure',
      version: 1,
      children: [scoped],
    });
    const normalizedScope = normalized.ir.children[0];
    expect(normalizedScope).toMatchObject({ type: 'scope', theme: localTheme });
    expect(normalizedScope.type).toBe('scope');
    if (normalizedScope.type !== 'scope' || 'namespace' in normalizedScope) throw new Error('expected Scope');
    expect(normalizedScope.theme).not.toBe(scoped.theme);
  });

  it.each([
    ['figure helper null', figure({ theme: null as never, children: [] }), /scene\.theme/i],
    ['figure helper number', figure({ theme: 1 as never, children: [] }), /scene\.theme/i],
    [
      'Scope helper string',
      figure({ children: [scope({ theme: 'dark' as never }, [])] }),
      /children\[0\]\.scope\.theme/i,
    ],
    ['direct spec number', { type: 'figure', version: 1, theme: 1, children: [] } as never, /scene\.theme/i],
    ['figure helper Date', figure({ theme: new Date() as never, children: [] }), /scene\.theme/i],
    ['figure helper Map', figure({ theme: new Map() as never, children: [] }), /scene\.theme/i],
    ['figure helper Set', figure({ theme: new Set() as never, children: [] }), /scene\.theme/i],
    ['figure helper class', figure({ theme: new ThemeInstance(), children: [] }), /scene\.theme/i],
    [
      'Scope helper inherited field',
      figure({ children: [scope({ theme: Object.create({ style: ThemeStyle.Academic }) as never }, [])] }),
      /children\[0\]\.scope\.theme/i,
    ],
  ])('伪造的 %s Theme输入保留到 Core并严格拒绝', (_label, spec, expected) => {
    expect(() => renderToSvgString(spec)).toThrow(expected);
  });

  it('Theme helper不读取 accessor或洗掉隐藏字段', () => {
    let accessorReads = 0;
    const accessorTheme = {};
    Object.defineProperty(accessorTheme, 'mode', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return ThemeMode.Dark;
      },
    });
    const hiddenTheme = { style: ThemeStyle.Academic };
    Object.defineProperty(hiddenTheme, 'palette', { value: 'paper', enumerable: false });

    expect(() => renderToSvgString(figure({ theme: accessorTheme, children: [] }))).toThrow(/scene\.theme/i);
    expect(accessorReads).toBe(0);
    expect(() => renderToSvgString(figure({ children: [scope({ theme: hiddenTheme }, [])] }))).toThrow(
      /children\[0\]\.scope\.theme/i,
    );
  });

  it('Theme helper不吞掉自有__proto__未知字段', () => {
    const rootTheme = { style: ThemeStyle.Academic };
    Object.defineProperty(rootTheme, '__proto__', { value: 'root', enumerable: true });
    const localTheme = { mode: ThemeMode.Dark };
    Object.defineProperty(localTheme, '__proto__', { value: 'scope', enumerable: true });

    expect(() => renderToSvgString(figure({ theme: rootTheme, children: [] }))).toThrow(/scene\.theme\.__proto__/i);
    expect(() => renderToSvgString(figure({ children: [scope({ theme: localTheme }, [])] }))).toThrow(
      /children\[0\]\.scope\.theme\.__proto__/i,
    );
  });

  it('path helper 共享 parseWay 的 axis-line lowering', () => {
    expect(
      path('axis', {
        way: [[0, 0], { horizontalTo: 'target.center' }, { verticalTo: [40, 60] }],
      }),
    ).toMatchObject({
      type: 'path',
      id: 'axis',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: { id: 'target', anchor: 'center' } },
        { type: 'step', kind: 'axis-line', axis: 'vertical', to: [40, 60] },
      ],
    });
  });

  it('path helper 共享 parseWay 的三段 fold lowering', () => {
    expect(path('fold', { way: ['A', { via: '|-|', fraction: 0.25 }, 'B'] })).toMatchObject({
      type: 'path',
      id: 'fold',
      children: [
        { type: 'step', kind: 'move', to: { id: 'A' } },
        { type: 'step', kind: 'fold', via: '|-|', fraction: 0.25, to: { id: 'B' } },
      ],
    });
  });

  it('authoring 只进入领域中立 sites，不写入 Core IR 或 inspection sidecar', () => {
    const authoring = Object.freeze({ extension: 'fixture' });
    const normalized = normalizeFigureSpec(
      figure({
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
    expect(normalized).not.toHaveProperty('inspectionRoots');
    expect(JSON.stringify(normalized.ir)).not.toContain('authoring');
    expect(JSON.stringify(normalized.ir)).not.toContain('inspect');
  });

  it('node helper 透传 anchor-to-anchor position', () => {
    const position = {
      kind: 'anchor' as const,
      target: { id: 'A', anchor: 'bottom-left' as const, offset: [6, -2] as [number, number] },
      selfAnchor: 'top-left' as const,
    };

    expect(node('B', { position })).toEqual({ type: 'node', id: 'B', position });
  });

  it('node helper 组合透传 label position、distance、rotate、keepUpright 与 pin', () => {
    const label = {
      text: 'L',
      position: { boundary: 'right' as const, fraction: 0.25 },
      distance: 6,
      rotate: 'radial' as const,
      keepUpright: true,
      pin: { stroke: 'red', strokeWidth: 2 },
    };

    expect(node('labelled', { position: [0, 0], label })).toEqual({
      type: 'node',
      id: 'labelled',
      position: [0, 0],
      label,
    });
  });

  it('scope helper 直接透传 placement 与 transform pivot，不物化默认值', () => {
    const config = {
      id: 'cluster',
      placement: {
        target: { id: 'panel', anchor: 'top-right' as const, offset: [4, -2] as [number, number] },
        selfAnchor: 'top-left' as const,
      },
      transforms: [
        { kind: 'scale' as const, x: 1.2, pivot: 'center' as const },
        { kind: 'rotate' as const, degrees: 12, pivot: [8, 12] as [number, number] },
      ],
    };

    expect(scope(config, [node('inside', { position: [0, 0] })])).toEqual({
      type: 'scope',
      ...config,
      children: [node('inside', { position: [0, 0] })],
    });
  });

  it('node/scope helper 原样透传 auto-contrast textColor，并由 Core 按每个 Node 的 fill 解析', () => {
    const spec = figure([
      scope({ nodeDefault: { textColor: NodeTextColor.Contrast } }, [
        node('light', { position: [-30, 0], text: 'light', fill: '#ffffff' }),
        node('dark', { position: [30, 0], text: 'dark', fill: '#000000' }),
      ]),
    ]);

    expect(spec.children?.[0]).toMatchObject({
      type: 'scope',
      nodeDefault: { textColor: NodeTextColor.Contrast },
    });
    const svg = renderToSvgString(spec);
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('fill="#ffffff"');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('helpers-return-plain-spec：figure/node/path/layer/embed 只返回 plain object', () => {
    const spec = figure({
      id: 'basic',
      layers: [
        layer('main', { cache: VanillaLayerCache.Static }, [
          node('a', { position: [0, 0], text: 'A' }),
          path('edge', { way: ['a', 'b'], marks: [{ pos: 1, mark: { kind: 'arrow' } }] }),
          embed('fixture-box', 'box', { text: 'Hi', data: {} }),
        ]),
      ],
    });

    expect(spec.type).toBe('figure');
    expect(spec.version).toBe(1);
    expect('mount' in spec).toBe(false);
    expect(node()).toEqual({ type: 'node' });
    expect(node('loose')).toEqual({ type: 'node', id: 'loose' });
    expect(spec.layers?.[0].children[1]).toMatchObject({ type: 'path', id: 'edge' });
  });

  it('plain-spec-normalizes-to-ir：children 简写规范化到默认 layer metadata', () => {
    const spec = figure([node('a', { position: [0, 0], text: 'A' })]);
    const normalized = normalizeFigureSpec(spec);

    expect(normalized.ir).toEqual({
      type: 'scene',
      version: 1,
      children: [node('a', { position: [0, 0], text: 'A' })],
    });
    expect(normalized.runtimeMeta.layers).toEqual([
      {
        id: 'default',
        cache: VanillaLayerCache.Auto,
        order: 0,
        zIndex: 0,
        childIds: ['a'],
        hasAnonymousChildren: false,
        invalidationBoundary: 'default',
      },
    ]);
  });

  it('layer-cache-order：zIndex 升序且同值保持声明顺序，cache metadata 不进 IR', () => {
    const normalized = normalizeFigureSpec(
      figure({
        layers: [
          layer('top', { zIndex: 10, cache: VanillaLayerCache.Dynamic }, [node('top-node', { position: [10, 0] })]),
          layer('base', { cache: VanillaLayerCache.Static }, [node('base-node', { position: [0, 0] })]),
        ],
      }),
    );

    expect(normalized.ir.children.map(child => child.id)).toEqual(['base-node', 'top-node']);
    expect(normalized.runtimeMeta.layers.map(entry => [entry.id, entry.cache, entry.zIndex])).toEqual([
      ['base', VanillaLayerCache.Static, 0],
      ['top', VanillaLayerCache.Dynamic, 10],
    ]);
    expect(JSON.stringify(normalized.ir)).not.toContain('static');
  });

  it('embed-adapter-lowers：adapter contribution 按 namespace 合并并只调一次 makeComposites', () => {
    const sharedData = { rows: [1] };
    const makeComposites = vi.fn(() => [boxComposite]);
    const adapter = makeAdapter(makeComposites);
    const svg = renderToSvgString(
      figure({
        layers: [
          layer('chart', [
            embed('fixture-box', 'a', { text: 'A', data: sharedData }),
            embed('fixture-box', 'b', { text: 'B', data: sharedData }),
          ]),
        ],
      }),
      { adapters: [adapter] },
    );

    expect(makeComposites).toHaveBeenCalledTimes(1);
    expect(makeComposites).toHaveBeenCalledWith({ shared: sharedData });
    expect(svg).toContain('<rect');
  });

  it('embed-special-reference：特殊原型键同引用复用并作为 own property 传给 maker', () => {
    const sharedData = { rows: [1] };
    const makeComposites = vi.fn<(mergedDatasets: Record<string, unknown>) => Array<AnyCompositeDefinition>>(() => [
      boxComposite,
    ]);
    const adapter: VanillaTier2Adapter<{ text: string; data: object }> = {
      kind: 'special-reference',
      namespace: 'fixture',
      lower: props => ({
        node: { namespace: 'fixture', type: 'box', text: props.text },
        datasets: Object.fromEntries([
          ['__proto__', props.data],
          ['toString', props.data],
        ]),
        makeComposites,
      }),
    };
    const spec = figure({
      layers: [
        layer('chart', [
          embed('special-reference', 'a', { text: 'A', data: sharedData }),
          embed('special-reference', 'b', { text: 'B', data: sharedData }),
        ]),
      ],
    });

    normalizeFigureSpec(spec, { adapters: [adapter] });

    const merged = makeComposites.mock.calls[0][0];
    expect(Object.hasOwn(merged, '__proto__')).toBe(true);
    expect(Object.hasOwn(merged, 'toString')).toBe(true);
    expect(merged.__proto__).toBe(sharedData);
    expect(merged.toString).toBe(sharedData);
  });

  it('embed-output-identities：adapter 输出 id 必须从 embed id 派生并进入 identityIndex', () => {
    const adapter: VanillaTier2Adapter<{ label: string }> = {
      kind: 'named-output',
      namespace: 'fixture',
      lower: props => ({
        node: {
          type: 'scope',
          id: 'chart/root',
          children: [node('chart/label', { position: [0, 0], text: props.label })],
        },
        datasets: {},
        makeComposites: () => [],
      }),
    };

    const normalized = normalizeFigureSpec(
      figure({ layers: [layer('main', [embed('named-output', 'chart', { label: 'A' })])] }),
      {
        adapters: [adapter],
      },
    );

    expect(normalized.runtimeMeta.identityIndex.get('chart')).toEqual(['main', 'chart']);
    expect(normalized.runtimeMeta.identityIndex.get('chart/root')).toEqual(['main', 'chart', 'chart/root']);
    expect(normalized.runtimeMeta.identityIndex.get('chart/label')).toEqual([
      'main',
      'chart',
      'chart/root',
      'chart/label',
    ]);
  });

  it('embed-output-identity-prefix-throws：adapter 输出 id 不从 embed id 派生时抛错', () => {
    const adapter: VanillaTier2Adapter<{ text: string }> = {
      kind: 'bad-output',
      namespace: 'fixture',
      lower: props => ({
        node: node('external', { position: [0, 0], text: props.text }),
        datasets: {},
        makeComposites: () => [],
      }),
    };

    const spec = figure({ layers: [layer('main', [embed('bad-output', 'chart', { text: 'A' })])] });

    expect(() => normalizeFigureSpec(spec, { adapters: [adapter] })).toThrow(/must start with "chart\/"/i);
  });

  it('missing-embed-adapter-throws：缺 adapter 时 fail-loud', () => {
    const spec = figure({ layers: [layer('chart', [embed('missing', 'x', {})])] });
    expect(() => normalizeFigureSpec(spec)).toThrow(/adapter/i);
  });

  it('conflicting-dataset-reference-throws：同 namespace 同 reference 异对象抛错', () => {
    const adapter = makeAdapter();
    const spec = figure({
      layers: [
        layer('chart', [
          embed('fixture-box', 'a', { text: 'A', data: { rows: [1] } }),
          embed('fixture-box', 'b', { text: 'B', data: { rows: [1] } }),
        ]),
      ],
    });

    expect(() => normalizeFigureSpec(spec, { adapters: [adapter] })).toThrow(/reference conflict/i);
  });

  it('conflicting-namespace-maker-throws：同 namespace 使用不同 makeComposites 会抛错', () => {
    const first: VanillaTier2Adapter<{ text: string }> = {
      kind: 'first',
      namespace: 'fixture',
      lower: props => ({
        node: { namespace: 'fixture', type: 'box', text: props.text },
        datasets: {},
        makeComposites: () => [boxComposite],
      }),
    };
    const second: VanillaTier2Adapter<{ text: string }> = {
      kind: 'second',
      namespace: 'fixture',
      lower: props => ({
        node: { namespace: 'fixture', type: 'box', text: props.text },
        datasets: {},
        makeComposites: () => [boxComposite],
      }),
    };
    const spec = figure({
      layers: [layer('chart', [embed('first', 'a', { text: 'A' }), embed('second', 'b', { text: 'B' })])],
    });

    expect(() => normalizeFigureSpec(spec, { adapters: [first, second] })).toThrow(/multiple makeComposites/i);
  });

  it('duplicate-identity-throws：重复公开 identity 抛错并包含 id', () => {
    const spec = figure({
      layers: [layer('main', [node('a', { position: [0, 0] }), node('a', { position: [1, 0] })])],
    });

    expect(() => normalizeFigureSpec(spec)).toThrow(/duplicate identity "a"/i);
  });

  it('anonymous-child-invalidates-parent-layer：匿名直接 child 标记父 layer 为最小失效边界', () => {
    const normalized = normalizeFigureSpec(
      figure({
        layers: [
          layer('main', [
            node({ position: [0, 0] }),
            path({
              way: [
                [0, 0],
                [10, 0],
              ],
            }),
          ]),
        ],
      }),
    );

    expect(normalized.runtimeMeta.layers[0]).toMatchObject({
      id: 'main',
      childIds: [],
      hasAnonymousChildren: true,
      invalidationBoundary: 'main',
    });
  });

  it('children-or-layers-exclusive：手写非法 spec 同时含 children/layers 会抛错', () => {
    const invalid = {
      type: 'figure',
      version: 1,
      children: [],
      layers: [],
    } as never;

    expect(() => normalizeFigureSpec(invalid)).toThrow(/children and layers/i);
  });

  it('mount-renderer-switch：统一 mount 支持 svg/canvas 并暴露 runtimeMeta', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createCanvasContext());
    const spec = figure({ layers: [layer('main', [node('a', { position: [0, 0], text: 'A' })])] });
    const svgContainer = document.createElement('div');
    const canvasContainer = document.createElement('div');

    const svgView = mount(svgContainer, spec);
    const canvasView = mount(canvasContainer, spec, { renderer: 'canvas', output: { width: 100, height: 100 } });

    expect(svgView.root.tagName.toLowerCase()).toBe('svg');
    expect(canvasView.root.tagName.toLowerCase()).toBe('canvas');
    expect(svgView.runtimeMeta.layers[0].id).toBe('main');
    expect(canvasView.runtimeMeta.layers[0].id).toBe('main');
  });
});
