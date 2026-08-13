import type { AnyCompositeDefinition } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { InputEmbedAdapter, InputScene } from '../../src';

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
    compositeDependencies: {
      roots: [{ namespace: 'fixture', type: 'box' }],
      providers: [
        {
          key: { namespace: 'fixture', type: 'box' },
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
            { type: 'path', id: 'edge', way: ['source', [24, 0]], thickness: 'thick' },
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
        compositeDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
      }),
    };

    const normalized = normalizeScene(
      scene({ layers: [layer('main', [embed('named-output', 'chart', { label: 'A' })])] }),
      { adapters: [adapter] },
    );

    expect(normalized.runtimeMeta.identityIndex.get('chart')).toEqual(['main', 'chart']);
    expect(normalized.runtimeMeta.identityIndex.get('chart/root')).toEqual(['main', 'chart', 'chart/root']);
    expect(normalized.runtimeMeta.parentIndex.get('chart/label')).toBe('chart/root');
  });

  it('缺失 adapter 或重复 identity 时在 Input normalizer fail-loud', () => {
    expect(() => normalizeScene(scene([embed('missing', 'x', {})]))).toThrow(/adapter/i);
    expect(() => normalizeScene(scene([node('a', { position: [0, 0] }), node('a', { position: [1, 0] })]))).toThrow(
      /duplicate identity "a"/i,
    );
  });

  it('typed InputScene 不能同时提供 children 和 layers', () => {
    const invalid = {
      type: 'scene',
      children: [],
      layers: [],
    } as never;

    expect(() => normalizeScene(invalid)).toThrow(/children and layers/i);
  });
});
