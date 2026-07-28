// @vitest-environment jsdom
import type { AnyCompositeDefinition, IRScene, SceneRuntimeSnapshot } from '@retikz/core';
import type {
  RenderRuntimeConfig,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
} from '@retikz/render/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { defineRetainedRenderer, RetainedRenderErrorCode } from '@retikz/render/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { RetainedSvgUpdateOptions, VanillaFigureSpec, VanillaTier2Adapter } from '../../src';

import { mountCanvas, mountSvg, VanillaLayerCache } from '../../src';
import { createRetainedCompositeDefinitions } from '../../src/runtime/retained-composites';

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'changed', position: [0, 0], shape: 'rectangle', fill },
    { type: 'node', id: 'stable', position: [40, 0], shape: 'rectangle', fill: '#ffffff' },
  ],
});

const createRecordingContext = (): CanvasRenderingContext2D => {
  const target: Record<string | symbol, unknown> = {
    canvas: null,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
  };
  return new Proxy(target, {
    get(value, key) {
      if (key in value) return value[key];
      return () => undefined;
    },
    set(value, key, next) {
      value[key] = next;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
};

/** 构造只保留 committed snapshot 的第三方 renderer，用于 adapter transaction 测试 */
const createMemoryRendererFactory = (
  capability: 'none' | 'entity',
  failUpdate: boolean | (() => boolean) = false,
  onConfig?: (config: RenderRuntimeConfig) => void,
  onPatch?: (patch: unknown) => void,
): RetainedRendererFactory =>
  ((input: RetainedRendererFactoryInput) => {
    let current: SceneRuntimeSnapshot | undefined;
    const prepare = (snapshot: SceneRuntimeSnapshot): RuntimePreparedCommit => {
      if (current !== undefined) {
        const shouldFail = typeof failUpdate === 'function' ? failUpdate() : failUpdate;
        if (shouldFail) throw new Error('expected update failure');
      }
      const previous = current;
      return Object.freeze({
        commit: () => {
          current = snapshot;
        },
        rollback: () => {
          current = previous;
        },
        dispose: () => undefined,
      });
    };
    const definition = {
      capability,
      prepareMount: (snapshot: SceneRuntimeSnapshot, config: RenderRuntimeConfig) => {
        onConfig?.(config);
        return prepare(snapshot);
      },
      prepare: (patch: unknown, snapshot: SceneRuntimeSnapshot, config: RenderRuntimeConfig) => {
        onPatch?.(patch);
        onConfig?.(config);
        return prepare(snapshot);
      },
      read: () => {
        if (current === undefined) throw new Error('memory renderer is not committed');
        return Object.freeze({ snapshot: current });
      },
      dispose: () => {
        current = undefined;
      },
    };
    return input.backend === 'svg'
      ? defineRetainedRenderer({ ...definition, backend: 'svg', host: input.host })
      : defineRetainedRenderer({ ...definition, backend: 'canvas', host: input.host });
  }) as RetainedRendererFactory;

const datasetCompositeSchema = CompositeBaseSchema.extend({
  namespace: z.literal('fixture'),
  type: z.literal('datasetBox'),
});

const makeDatasetComposites = (datasets: Record<string, unknown>): Array<AnyCompositeDefinition> => [
  defineComposite({
    namespace: 'fixture',
    type: 'datasetBox',
    schema: datasetCompositeSchema,
    expand: () => ({
      type: 'node',
      id: 'dataset-box',
      position: [0, 0],
      shape: 'rectangle',
      fill: z.string().parse(datasets.color),
    }),
  }),
];

const datasetAdapter: VanillaTier2Adapter<{ color: string }> = {
  kind: 'fixture-dataset',
  namespace: 'fixture',
  lower: props => ({
    node: { namespace: 'fixture', type: 'datasetBox' },
    datasets: { color: props.color },
    makeComposites: makeDatasetComposites,
  }),
};

const datasetFigure = (color: string): VanillaFigureSpec => ({
  type: 'figure',
  version: 1,
  children: [{ type: 'embed', kind: 'fixture-dataset', id: 'dataset', props: { color } }],
});

beforeEach(() => {
  const context = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('@retikz/vanilla retained mount', () => {
  it('composite candidate rollback 后稳定代理恢复旧 callback', () => {
    const initial = makeDatasetComposites({ color: '#ef4444' })[0];
    const candidate = makeDatasetComposites({ color: '#22c55e' })[0];
    const retained = createRetainedCompositeDefinitions([initial]);
    const delegate = retained.definitions[0];
    if (typeof delegate.expand !== 'function') throw new Error('expected expand delegate');
    const node = { namespace: 'fixture', type: 'datasetBox' } as never;

    const prepared = retained.prepare([candidate]);
    expect(delegate.expand(node)).toMatchObject({ fill: '#22c55e' });
    prepared.rollback();

    expect(delegate.expand(node)).toMatchObject({ fill: '#ef4444' });
  });

  it('renderer transaction 失败后 session 恢复旧 composite callback', () => {
    const redExpand = vi.fn((): IRScene['children'][number] => ({
      type: 'node',
      id: 'dataset-box',
      position: [0, 0],
      shape: 'rectangle',
      fill: '#ef4444',
    }));
    const greenExpand = vi.fn((): IRScene['children'][number] => ({
      type: 'node',
      id: 'dataset-box',
      position: [0, 0],
      shape: 'rectangle',
      fill: '#22c55e',
    }));
    const definitions = {
      '#ef4444': defineComposite({
        namespace: 'fixture',
        type: 'datasetBox',
        schema: datasetCompositeSchema,
        expand: redExpand,
      }),
      '#22c55e': defineComposite({
        namespace: 'fixture',
        type: 'datasetBox',
        schema: datasetCompositeSchema,
        expand: greenExpand,
      }),
    } as const;
    const makeComposites = (datasets: Record<string, unknown>): Array<AnyCompositeDefinition> => [
      definitions[z.enum(['#ef4444', '#22c55e']).parse(datasets.color)],
    ];
    const adapter: VanillaTier2Adapter<{ color: string }> = {
      kind: 'fixture-cached-dataset',
      namespace: 'fixture',
      lower: props => ({
        node: { namespace: 'fixture', type: 'datasetBox' },
        datasets: { color: props.color },
        makeComposites,
      }),
    };
    const figure = (color: '#ef4444' | '#22c55e'): VanillaFigureSpec => ({
      type: 'figure',
      version: 1,
      children: [{ type: 'embed', kind: 'fixture-cached-dataset', id: 'dataset', props: { color } }],
    });
    let rejectNextUpdate = true;
    const rendererFactory = createMemoryRendererFactory('entity', () => {
      const reject = rejectNextUpdate;
      rejectNextUpdate = false;
      return reject;
    });
    const view = mountSvg(document.createElement('div'), figure('#ef4444'), {
      adapters: [adapter],
      runtime: { rendererFactory },
    });

    expect(() => view.update(figure('#22c55e'))).toThrow(/RUNTIME_PARTICIPANT_PREPARE_FAILED/);
    expect(greenExpand).toHaveBeenCalledTimes(1);
    view.update(figure('#ef4444'));

    expect(redExpand).toHaveBeenCalledTimes(1);
  });

  it('composite Definition 数量、顺序、key、schema 与执行分支变化时 fail-loud', () => {
    const firstSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('first'),
    });
    const secondSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('second'),
    });
    const first = defineComposite({
      namespace: 'fixture',
      type: 'first',
      schema: firstSchema,
      expand: () => ({ type: 'coordinate', id: 'first', position: [0, 0] }),
    });
    const second = defineComposite({
      namespace: 'fixture',
      type: 'second',
      schema: secondSchema,
      expand: () => ({ type: 'coordinate', id: 'second', position: [1, 1] }),
    });
    const sameKeyNewSchema = defineComposite({
      namespace: 'fixture',
      type: 'first',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('first'),
      }),
      expand: () => ({ type: 'coordinate', id: 'first', position: [2, 2] }),
    });
    const sameKeyCompileBranch = defineComposite({
      namespace: 'fixture',
      type: 'first',
      schema: firstSchema,
      compile: () => ({ children: [] }),
    });
    const retained = createRetainedCompositeDefinitions([first, second]);
    const invalid = expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid });

    expect(() => retained.prepare([first])).toThrow(invalid);
    expect(() => retained.prepare([second, first])).toThrow(invalid);
    expect(() => retained.prepare([sameKeyNewSchema, second])).toThrow(invalid);
    expect(() => retained.prepare([sameKeyCompileBranch, second])).toThrow(invalid);
  });

  it('layout-aware composite artifactSchema identity 变化时 fail-loud', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('layout'),
    });
    const initial = defineComposite({
      namespace: 'fixture',
      type: 'layout',
      schema,
      artifactSchema: z.strictObject({ value: z.literal('initial') }),
      compile: () => ({ children: [], artifact: { value: 'initial' } }),
    });
    const candidate = defineComposite({
      namespace: 'fixture',
      type: 'layout',
      schema,
      artifactSchema: z.strictObject({ value: z.literal('candidate') }),
      compile: () => ({ children: [], artifact: { value: 'candidate' } }),
    });
    const retained = createRetainedCompositeDefinitions([initial]);

    expect(() => retained.prepare([candidate])).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
  });

  it('plain spec update 使用本次 normalization 生成的 composite definitions', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, datasetFigure('#ef4444'), { adapters: [datasetAdapter] });

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#ef4444');
    view.update(datasetFigure('#22c55e'));

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#22c55e');
  });

  it('mount 后修改 adapter callback 不改变 retained session compile 语义', () => {
    const container = document.createElement('div');
    const adapter = { ...datasetAdapter };
    const view = mountSvg(container, datasetFigure('#ef4444'), { adapters: [adapter] });

    adapter.lower = () => ({
      node: { namespace: 'fixture', type: 'datasetBox' },
      datasets: { color: '#22c55e' },
      makeComposites: makeDatasetComposites,
    });
    view.update(datasetFigure('#ef4444'));

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#ef4444');
  });

  it('mount 后修改 compile composite record 不改变 retained session compile 语义', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('fixedComposite'),
    });
    const composite = defineComposite({
      namespace: 'fixture',
      type: 'fixedComposite',
      schema,
      expand: () => ({
        type: 'node',
        id: 'fixed-composite',
        position: [0, 0],
        shape: 'rectangle',
        fill: '#ef4444',
      }),
    });
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'fixture', type: 'fixedComposite' }],
    };
    const container = document.createElement('div');
    const view = mountSvg(container, initial, { compile: { composites: [composite] } });

    (composite as { expand: () => IRScene['children'][number] }).expand = () => ({
      type: 'node',
      id: 'fixed-composite',
      position: [0, 0],
      shape: 'rectangle',
      fill: '#22c55e',
    });
    view.update({
      ...initial,
      children: [...initial.children, { type: 'coordinate', id: 'revision', position: [40, 0] }],
    });

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#ef4444');
  });

  it('公开 runtimeMeta mutation 不改变后续 renderer config', () => {
    const observedCachePolicies: Array<RenderRuntimeConfig['cachePolicy']> = [];
    const container = document.createElement('div');
    const view = mountSvg(
      container,
      {
        type: 'figure',
        version: 1,
        layers: [
          {
            type: 'layer',
            id: 'main',
            cache: VanillaLayerCache.Static,
            children: [{ type: 'node', id: 'box', position: [0, 0], shape: 'rectangle' }],
          },
        ],
      },
      {
        runtime: {
          rendererFactory: createMemoryRendererFactory('entity', false, config =>
            observedCachePolicies.push(config.cachePolicy),
          ),
        },
      },
    );

    expect(() => {
      (view.runtimeMeta.layers[0] as { cache: string }).cache = VanillaLayerCache.Dynamic;
    }).toThrow(TypeError);
    expect(() => {
      (view.runtimeMeta.identityIndex as Map<string, Array<string>>).set('forged', ['main']);
    }).toThrow(TypeError);
    view.hydrate({ handlers: {} });

    expect(observedCachePolicies).toEqual(['static', 'static']);
  });

  it('Canvas retained update 在运行时拒绝 DPR 与未知字段', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, source('#ef4444'));

    expect(() => view.update(source('#22c55e'), { canvas: { devicePixelRatio: 2 } } as never)).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(() => view.update(source('#22c55e'), { unknown: true } as never)).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
  });

  it('retained update 在读取前递归拒绝 accessor 与非标准数组属性', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));
    const committedHtml = view.root.innerHTML;
    const registryGetter = vi.fn(() => [0, 0, 1, 1]);
    const easings = Object.defineProperty({}, 'custom', {
      enumerable: true,
      get: registryGetter,
    });

    expect(() => view.update(source('#22c55e'), { animation: { easings } })).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(registryGetter).not.toHaveBeenCalled();

    const tuple = [0, 0, 1, 1];
    Object.defineProperty(tuple, Symbol('hidden'), { enumerable: true, value: true });
    expect(() => view.update(source('#22c55e'), { animation: { easings: { custom: tuple } } } as never)).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(view.root.innerHTML).toBe(committedHtml);
  });

  it('SVG 与 Canvas retained initial mount 各只编译一次', () => {
    const expand = vi.fn((): IRScene['children'][number] => ({
      type: 'node',
      id: 'compiled-once',
      position: [0, 0],
      shape: 'rectangle',
    }));
    const composite = defineComposite({
      namespace: 'fixture',
      type: 'compileOnce',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('compileOnce'),
      }),
      expand,
    });
    const input: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'fixture', type: 'compileOnce' }],
    };

    const svg = mountSvg(document.createElement('div'), input, { compile: { composites: [composite] } });
    expect(expand).toHaveBeenCalledTimes(1);
    svg.dispose();
    expand.mockClear();

    const canvas = mountCanvas(document.createElement('div'), input, {
      compile: { composites: [composite] },
      output: { width: 100, height: 100 },
    });
    expect(expand).toHaveBeenCalledTimes(1);
    canvas.dispose();
  });

  it('IR SVG 使用 retained session，并保留未变节点 identity', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));

    expect(view.mode).toBe('retained');
    const stable = view.root.querySelector('[data-retikz-id="stable"]');

    view.update(source('#22c55e'));

    expect(view.root.querySelector('[data-retikz-id="stable"]')).toBe(stable);
    expect(view.diagnostics()).toEqual([]);
  });

  it('retained hydrate 以 contribution transaction 添加和移除 handler', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));
    const handler = vi.fn();
    const hydration = view.hydrate({ handlers: { changed: { click: handler } } });
    const target = view.root.querySelector('[data-retikz-id="changed"]');
    if (target === null) throw new Error('missing retained target');

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    hydration.dispose();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retained hydrate 添加失败不泄漏 contribution', () => {
    const container = document.createElement('div');
    const observedConfigs: Array<RenderRuntimeConfig> = [];
    let rejectNextUpdate = true;
    const rendererFactory = createMemoryRendererFactory(
      'entity',
      () => {
        const reject = rejectNextUpdate;
        rejectNextUpdate = false;
        return reject;
      },
      config => observedConfigs.push(config),
    );
    const view = mountSvg(container, source('#ef4444'), { runtime: { rendererFactory } });
    const rejected = vi.fn();
    const accepted = vi.fn();

    expect(() => view.hydrate({ handlers: { changed: { click: rejected } } })).toThrow(
      /RUNTIME_PARTICIPANT_PREPARE_FAILED/,
    );
    view.hydrate({ handlers: { changed: { click: accepted } } });

    expect(observedConfigs.at(-1)?.handlerContributions).toEqual([
      expect.objectContaining({ handlers: { changed: { click: accepted } } }),
    ]);
  });

  it('retained hydrate 移除失败时 handle 保持 active 并可重试', () => {
    const container = document.createElement('div');
    const observedContributionCounts: Array<number> = [];
    let rejectNextUpdate = false;
    const rendererFactory = createMemoryRendererFactory(
      'entity',
      () => {
        const reject = rejectNextUpdate;
        rejectNextUpdate = false;
        return reject;
      },
      config => observedContributionCounts.push(config.handlerContributions?.length ?? 0),
    );
    const view = mountSvg(container, source('#ef4444'), { runtime: { rendererFactory } });
    const handler = vi.fn();
    const hydration = view.hydrate({ handlers: { changed: { click: handler } } });

    rejectNextUpdate = true;
    expect(() => hydration.dispose()).toThrow(/RUNTIME_PARTICIPANT_PREPARE_FAILED/);
    hydration.dispose();

    expect(observedContributionCounts).toEqual([0, 1, 0, 0]);
  });

  it('hydrate 后修改 handlers record 不改变 committed contribution', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));
    const first = vi.fn();
    const second = vi.fn();
    const handlers = { changed: { click: first } };
    view.hydrate({ handlers });

    handlers.changed.click = second;
    view.update(source('#22c55e'));
    view.root.querySelector('[data-retikz-id="changed"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('预编译 Scene 保持 static view', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, compileToScene(source('#ef4444')).scene);

    expect(view.mode).toBe('static');
  });

  it('IR Canvas 使用 retained session，预编译 Scene 使用 static view', () => {
    const retainedContainer = document.createElement('div');
    const retained = mountCanvas(retainedContainer, source('#ef4444'), { output: { width: 100, height: 100 } });
    const staticContainer = document.createElement('div');
    const staticView = mountCanvas(staticContainer, compileToScene(source('#ef4444')).scene);

    expect(retained.mode).toBe('retained');
    expect(staticView.mode).toBe('static');
    retained.dispose();
    staticView.dispose();
  });

  it('replace-only renderer 的 capability fallback diagnostic 对 view 可见', () => {
    const container = document.createElement('div');
    const patches: Array<unknown> = [];
    const view = mountSvg(container, source('#ef4444'), {
      runtime: { rendererFactory: createMemoryRendererFactory('none', false, undefined, patch => patches.push(patch)) },
    });

    view.update(source('#22c55e'));

    expect(patches).toEqual([
      expect.objectContaining({ operations: [expect.objectContaining({ kind: 'replaceScene' })] }),
    ]);
    expect(view.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RETAINED_RENDERER_CAPABILITY_FALLBACK', severity: 'warning' }),
    ]);
  });

  it('renderer update 失败时保留 committed artifacts 与 runtimeMeta identity', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'), {
      compile: { artifacts: { nodeLayouts: true } },
      runtime: { rendererFactory: createMemoryRendererFactory('entity', true) },
    });
    const artifacts = view.artifacts;
    const runtimeMeta = view.runtimeMeta;

    expect(() => view.update(source('#22c55e'))).toThrow(/RUNTIME_PARTICIPANT_PREPARE_FAILED/);
    expect(view.artifacts).toBe(artifacts);
    expect(view.runtimeMeta).toBe(runtimeMeta);
  });

  it('SVG retained update 在运行时拒绝 Canvas-only animationProperties 配置', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));

    expect(() =>
      view.update(source('#22c55e'), {
        canvas: { animationProperties: {} },
      } as unknown as RetainedSvgUpdateOptions),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }));
    view.dispose();
  });

  it('预编译 Scene 拒绝 retained renderer factory', () => {
    const container = document.createElement('div');
    const scene = compileToScene(source('#ef4444')).scene;

    expect(() =>
      mountSvg(container, scene, { runtime: { rendererFactory: createMemoryRendererFactory('entity') } }),
    ).toThrow(expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }));
  });
});
