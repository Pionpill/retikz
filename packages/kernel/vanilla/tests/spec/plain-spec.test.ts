// @vitest-environment jsdom
import type { CompositeDefinition } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { VanillaTier2Adapter } from '../../src';

import { embed, figure, layer, mount, node, path, renderToSvgString, VanillaLayerCache } from '../../src';
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
  it('node helper 透传 anchor-to-anchor position', () => {
    const position = {
      kind: 'anchor' as const,
      target: { id: 'A', anchor: 'bottom-left' as const, offset: [6, -2] as [number, number] },
      selfAnchor: 'top-left' as const,
    };

    expect(node('B', { position })).toEqual({ type: 'node', id: 'B', position });
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
    const makeComposites = vi.fn<(mergedDatasets: Record<string, unknown>) => Array<CompositeDefinition>>(() => [
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
