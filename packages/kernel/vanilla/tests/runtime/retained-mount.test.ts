// @vitest-environment jsdom
import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type {
  RenderFrameSnapshot,
  RenderRuntimeConfig,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
} from '@retikz/render/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import { compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import { defineRetainedRenderer, RetainedRenderErrorCode } from '@retikz/render/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  RetainedSvgUpdateOptions,
  StaticMountCanvasOptions,
  StaticMountOptions,
  StaticMountUnifiedOptions,
  VanillaCompileDriver,
  VanillaFigureSpec,
  VanillaTier2Adapter,
} from '../../src';

import { mount, mountCanvas, mountSvg, VanillaLayerCache } from '../../src';
import { createRetainedCompositeDefinitions } from '../../src/runtime/retained-composites';

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'changed', position: [0, 0], shape: 'rectangle', fill },
    { type: 'node', id: 'stable', position: [40, 0], shape: 'rectangle', fill: '#ffffff' },
  ],
});

const plainFigure = (fill: string): VanillaFigureSpec => ({
  version: 1,
  type: 'figure',
  layers: [
    {
      type: 'layer',
      id: 'main',
      children: source(fill).children,
    },
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
  onDispose?: () => void,
  onFrame?: (frame: RenderFrameSnapshot) => void,
  failMount: boolean | (() => boolean) = false,
): RetainedRendererFactory =>
  ((input: RetainedRendererFactoryInput) => {
    let current: RenderFrameSnapshot | undefined;
    const prepare = (frame: RenderFrameSnapshot): RuntimePreparedCommit => {
      if (current !== undefined) {
        const shouldFail = typeof failUpdate === 'function' ? failUpdate() : failUpdate;
        if (shouldFail) throw new Error('expected update failure');
      }
      const previous = current;
      return Object.freeze({
        commit: () => {
          current = frame;
          onFrame?.(frame);
        },
        rollback: () => {
          current = previous;
        },
        dispose: () => undefined,
      });
    };
    const definition = {
      capability,
      readonlyLayerCapability: 'supported' as const,
      prepareMount: (frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => {
        const shouldFail = typeof failMount === 'function' ? failMount() : failMount;
        if (shouldFail) throw new Error('expected mount failure');
        onConfig?.(config);
        return prepare(frame);
      },
      prepare: (patch: unknown, frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => {
        onPatch?.(patch);
        onConfig?.(config);
        return prepare(frame);
      },
      read: () => {
        if (current === undefined) throw new Error('memory renderer is not committed');
        return Object.freeze({ frame: current });
      },
      dispose: () => {
        current = undefined;
        onDispose?.();
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

const readonlyLayerScene = compileToScene({
  type: 'scene',
  version: 1,
  children: [{ type: 'node', position: [0, 0], shape: 'rectangle' }],
}).scene;

const createLayerDriver = (): VanillaCompileDriver => {
  const sessions = new WeakMap<
    object,
    { update: (authoring: unknown) => void; session: ReturnType<VanillaCompileDriver['create']> }
  >();
  return Object.freeze({
    create: input => {
      const existing = sessions.get(input.instance);
      const authoring = input.authoringSites[0]?.authoring;
      if (existing !== undefined) {
        existing.update(authoring);
        return existing.session;
      }
      let currentAuthoring = authoring;
      const session = Object.freeze({
        observers: Object.freeze([]),
        resolve: (coreOutput: Parameters<ReturnType<VanillaCompileDriver['create']>['resolve']>[0]) => {
          if (currentAuthoring === 'fail') throw new Error('expected compile driver failure');
          return Object.freeze({
            primary: coreOutput.result,
            observerOutputs: coreOutput.observerOutputs,
            layers:
              currentAuthoring === true
                ? Object.freeze([
                    Object.freeze({
                      key: 'fixture-layer',
                      scene: readonlyLayerScene,
                      transform: [1, 0, 0, 1, 0, 0] as const,
                    }),
                  ])
                : Object.freeze([]),
            diagnostics: Object.freeze([]),
          });
        },
      });
      sessions.set(input.instance, {
        update: next => {
          currentAuthoring = next;
        },
        session,
      });
      return session;
    },
  });
};

const layerFigure = (authoring: unknown): VanillaFigureSpec => ({
  type: 'figure',
  version: 1,
  authoring,
  children: [{ type: 'node', id: 'layer-box', position: [0, 0], shape: 'rectangle' }],
});

beforeEach(() => {
  const context = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('@retikz/vanilla retained mount', () => {
  it('同一 retained session 原子提交编译驱动产生的只读图层', () => {
    const frames: Array<RenderFrameSnapshot> = [];
    const configs: Array<RenderRuntimeConfig> = [];
    const dispose = vi.fn();
    const rendererFactory = createMemoryRendererFactory(
      'entity',
      false,
      config => configs.push(config),
      undefined,
      dispose,
      frame => frames.push(frame),
    );
    const view = mountSvg(document.createElement('div'), layerFigure(false), {
      compileDriver: createLayerDriver(),
      runtime: { rendererFactory },
    });
    const handler = vi.fn();
    view.hydrate({ handlers: { 'layer-box': { click: handler } } });

    view.update(layerFigure(true));

    expect(frames.at(-2)?.layers).toEqual([]);
    expect(frames.at(-1)?.layers).toHaveLength(1);
    expect(configs.at(-1)?.handlerContributions).toEqual([
      expect.objectContaining({ handlers: { 'layer-box': { click: handler } } }),
    ]);
    view.dispose();
    view.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('编译驱动解析失败时保留上一帧和 committed metadata', () => {
    const frames: Array<RenderFrameSnapshot> = [];
    const view = mountSvg(document.createElement('div'), layerFigure(true), {
      compileDriver: createLayerDriver(),
      runtime: {
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, undefined, undefined, frame =>
          frames.push(frame),
        ),
      },
    });
    const artifacts = view.artifacts;
    const runtimeMeta = view.runtimeMeta;
    const committed = frames.at(-1);

    expect(() => view.update(layerFigure('fail'))).toThrow(/RUNTIME_PARTICIPANT_PREPARE_FAILED/);
    expect(frames.at(-1)).toBe(committed);
    expect(view.artifacts).toBe(artifacts);
    expect(view.runtimeMeta).toBe(runtimeMeta);
    expect(() => view.update(layerFigure(false))).not.toThrow();
    view.dispose();
  });

  it('composite candidate rollback 后稳定代理恢复旧 callback', () => {
    const initial = makeDatasetComposites({ color: '#ef4444' })[0];
    const candidate = makeDatasetComposites({ color: '#22c55e' })[0];
    const retained = createRetainedCompositeDefinitions([initial]);
    const delegate = retained.definitions[0];
    if (typeof delegate.expand !== 'function') throw new Error('expected expand delegate');
    const node = { namespace: 'fixture', type: 'datasetBox' } as never;
    const context = { theme: { style: 'neutral', mode: 'light' } } as const;

    const prepared = retained.prepare([candidate]);
    expect(delegate.expand(node, context)).toMatchObject({ fill: '#22c55e' });
    prepared.rollback();

    expect(delegate.expand(node, context)).toMatchObject({ fill: '#ef4444' });
  });

  it('retained expand delegate透明转发 Core Theme context', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('themeDelegate'),
    });
    const initialExpand = vi.fn((_node, context) => ({
      type: 'node' as const,
      position: [0, 0] as [number, number],
      fill: context.theme.mode === 'dark' ? '#111111' : '#eeeeee',
    }));
    const initial = defineComposite({
      namespace: 'fixture',
      type: 'themeDelegate',
      schema,
      expand: initialExpand,
    });
    const retained = createRetainedCompositeDefinitions([initial]);
    const delegate = retained.definitions[0];
    if (typeof delegate.expand !== 'function') throw new Error('expected expand delegate');
    const context = { theme: { style: 'academic', mode: 'dark' } } as const;

    expect(delegate.expand({ namespace: 'fixture', type: 'themeDelegate' } as never, context)).toMatchObject({
      fill: '#111111',
    });
    expect(initialExpand).toHaveBeenCalledWith(expect.any(Object), context);
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

  it('IR/plain spec SVG static view 完整重绘、复用 root 并同步 metadata', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'), {
      runtime: { mode: 'static' },
      compile: { artifacts: { nodeLayouts: true } },
    });
    const root = view.root;

    view.update(plainFigure('#22c55e'));

    expect(view.mode).toBe('static');
    expect(view.root).toBe(root);
    expect(view.root.querySelector('[data-retikz-id="changed"]')?.getAttribute('fill')).toBe('#22c55e');
    expect(view.runtimeMeta.layers).toHaveLength(1);
    expect(view.artifacts.length).toBeGreaterThan(0);
  });

  it('IR/plain spec Canvas static view 完整重绘并复用 root', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, source('#ef4444'), {
      runtime: { mode: 'static' },
      output: { width: 100, height: 100 },
    });
    const root = view.root;

    view.update(plainFigure('#22c55e'));

    expect(view.mode).toBe('static');
    expect(view.root).toBe(root);
    expect(view.runtimeMeta.layers).toHaveLength(1);
  });

  it('retained full 保留 Session 但每次更新发布 replaceScene', () => {
    const patches: Array<unknown> = [];
    const view = mountSvg(document.createElement('div'), source('#ef4444'), {
      runtime: {
        mode: 'retained',
        updateStrategy: 'full',
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, patch => patches.push(patch)),
      },
    });

    view.update(source('#22c55e'));

    expect(view.mode).toBe('retained');
    expect(patches).toEqual([
      expect.objectContaining({ operations: [expect.objectContaining({ kind: 'replaceScene' })] }),
    ]);
    expect(view.diagnostics()).toEqual([]);
  });

  it('非法 mode、static 互斥字段与 accessor 在创建 DOM 前 fail-loud', () => {
    const invalidRuntimes: ReadonlyArray<unknown> = [
      { mode: 'incremental' },
      { mode: 'static', updateStrategy: 'full' },
      { mode: 'static', rendererFactory: createMemoryRendererFactory('entity') },
    ];
    for (const runtime of invalidRuntimes) {
      const container = document.createElement('div');
      expect(() =>
        mountSvg(container, source('#ef4444'), {
          runtime,
        } as never),
      ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }));
      expect(container.children).toHaveLength(0);
    }

    const getter = vi.fn(() => 'static');
    const runtime = Object.defineProperty({}, 'mode', { enumerable: true, get: getter });
    const container = document.createElement('div');
    expect(() => mountSvg(container, source('#ef4444'), { runtime } as never)).toThrowError(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(getter).not.toHaveBeenCalled();
    expect(container.children).toHaveLength(0);

    const runtimeGetter = vi.fn(() => ({ mode: 'static' }));
    const options = Object.defineProperty({}, 'runtime', { enumerable: true, get: runtimeGetter });
    expect(() => mountSvg(container, source('#ef4444'), options as never)).toThrowError(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
    expect(runtimeGetter).not.toHaveBeenCalled();
    expect(container.children).toHaveLength(0);
  });

  it('raw static compile 失败保留旧 view，materialization 失败同步抛出', () => {
    const view = mountSvg(document.createElement('div'), source('#ef4444'), {
      runtime: { mode: 'static' },
      compile: { artifacts: { nodeLayouts: true } },
    });
    const html = view.root.innerHTML;
    const artifacts = view.artifacts;
    const runtimeMeta = view.runtimeMeta;
    const invalid: IRScene = {
      ...source('#22c55e'),
      children: [{ type: 'node', id: 'invalid', position: [0, 0], shape: 'missing-shape' }],
    };

    expect(() => view.update(invalid)).toThrow();
    expect(view.root.innerHTML).toBe(html);
    expect(view.artifacts).toBe(artifacts);
    expect(view.runtimeMeta).toBe(runtimeMeta);

    vi.spyOn(view.root, 'appendChild').mockImplementationOnce(() => {
      throw new Error('materialization failed');
    });
    expect(() => view.update(source('#22c55e'))).toThrow('materialization failed');
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

  it('retained view 重复 dispose 时只重试失败 renderer cleanup', () => {
    const disposeFailure = new Error('dispose failed');
    let remainingFailures = 2;
    const dispose = vi.fn(() => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw disposeFailure;
      }
    });
    const view = mountSvg(document.createElement('div'), source('#ef4444'), {
      runtime: {
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, undefined, dispose),
      },
    });

    expect(() => view.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(view.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DISPOSE_FAILED', cause: disposeFailure }),
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DISPOSE_FAILED', cause: disposeFailure }),
    ]);
    expect(() => view.update(source('#22c55e'))).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_SESSION_DISPOSED' }),
    );

    expect(() => view.dispose()).not.toThrow();
    expect(() => view.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(3);
  });

  it('预编译 Scene 拒绝 retained renderer factory', () => {
    const container = document.createElement('div');
    const scene = compileToScene(source('#ef4444')).scene;

    expect(() =>
      mountSvg(container, scene, {
        runtime: { rendererFactory: createMemoryRendererFactory('entity') },
      } as unknown as StaticMountOptions),
    ).toThrow(expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }));
  });

  it('预编译 Scene 的三组 mount 入口拒绝任意 runtime 字段', () => {
    const scene = compileToScene(source('#ef4444')).scene;
    const runtimes: ReadonlyArray<unknown> = [undefined, {}, { unknown: true }, 1];
    const mountStatic = [
      (runtime: unknown) =>
        mountSvg(document.createElement('div'), scene, { runtime } as unknown as StaticMountOptions),
      (runtime: unknown) =>
        mountCanvas(document.createElement('div'), scene, { runtime } as unknown as StaticMountCanvasOptions),
      (runtime: unknown) =>
        mount(document.createElement('div'), scene, {
          renderer: 'svg',
          runtime,
        } as unknown as StaticMountUnifiedOptions & { renderer: 'svg' }),
    ];

    for (const entry of mountStatic) {
      for (const runtime of runtimes) {
        expect(() => entry(runtime)).toThrowError(
          expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
        );
      }
    }
  });
});
