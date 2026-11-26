import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { ReconcilerPreparedCommit } from '@retikz/reconciler';
import type {
  InputRendererFactory,
  SceneRuntimeSnapshot,
  RenderRuntimeConfig,
  RendererFactory,
} from '@retikz/render/runtime';
import { defineRenderer, RetikzRenderErrorCode } from '@retikz/render/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { literal, string, enum as zodEnum } from 'zod';

import type { InputEmbedAdapter, InputScene } from '../../src';
import { embed } from '../../src';
import type { MountOptions } from '../../src/dom';
import { mountSceneView } from '../../src/dom';

// @vitest-environment jsdom

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'changed',
      position: [0, 0],
      shape: 'rectangle',
      style: { fill },
    },
    {
      type: 'node',
      id: 'stable',
      position: [40, 0],
      shape: 'rectangle',
      style: { fill: '#ffffff' },
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
  onFrame?: (snapshot: SceneRuntimeSnapshot) => void,
  failMount: boolean | (() => boolean) = false,
  onCreate?: () => void,
): RendererFactory =>
  ((input: InputRendererFactory) => {
    onCreate?.();
    let current: SceneRuntimeSnapshot | undefined;

    const prepare = (snapshot: SceneRuntimeSnapshot): ReconcilerPreparedCommit => {
      if (current !== undefined) {
        const shouldFail = typeof failUpdate === 'function' ? failUpdate() : failUpdate;
        if (shouldFail) throw new Error('expected update failure');
      }

      const previous = current;

      return Object.freeze({
        commit: () => {
          current = snapshot;
          onFrame?.(snapshot);
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
        const shouldFail = typeof failMount === 'function' ? failMount() : failMount;
        if (shouldFail) throw new Error('expected mount failure');

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
        onDispose?.();
      },
    };

    return input.backend === 'svg'
      ? defineRenderer({ ...definition, backend: 'svg', host: input.host })
      : defineRenderer({ ...definition, backend: 'canvas', host: input.host });
  }) as RendererFactory;

const datasetCompositeSchema = CompositeBaseSchema.extend({
  namespace: literal('fixture'),
  type: literal('datasetBox'),
});

const makeDatasetDefinition = (contributions: ReadonlyArray<{ color: string }>): AnyCompositeDefinition =>
  defineComposite({
    namespace: 'fixture',
    type: 'datasetBox',
    schema: datasetCompositeSchema,
    compile: () => ({
      children: [
        {
          type: 'node',
          id: 'dataset-box',
          position: [0, 0],
          shape: 'rectangle',
          style: { fill: string().parse(contributions[0].color) },
        },
      ],
    }),
  });

const datasetAdapter: InputEmbedAdapter<{ color: string }> = {
  kind: 'fixture-dataset',
  lower: props => ({
    node: { namespace: 'fixture', type: 'datasetBox' },
    providerDependencies: {
      roots: [{ capability: 'composite', namespace: 'fixture', type: 'datasetBox' }],
      providers: [
        {
          key: { capability: 'composite', namespace: 'fixture', type: 'datasetBox' },
          params: { color: props.color },
          makeDefinition: makeDatasetDefinition,
        },
      ],
    },
  }),
};

const datasetScene = (color: string): InputScene => ({
  type: 'scene',
  children: [embed({ adapter: datasetAdapter, id: 'dataset', props: { color } })],
});

beforeEach(() => {
  const context = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mountSceneView 会话生命周期', () => {
  it('renderer transaction 失败后 session 恢复旧 composite callback', () => {
    const redCompile = vi.fn(() => ({
      children: [
        {
          type: 'node' as const,
          id: 'dataset-box',
          position: [0, 0] as [number, number],
          shape: 'rectangle',
          style: { fill: '#ef4444' },
        },
      ],
    }));
    const greenCompile = vi.fn(() => ({
      children: [
        {
          type: 'node' as const,
          id: 'dataset-box',
          position: [0, 0] as [number, number],
          shape: 'rectangle',
          style: { fill: '#22c55e' },
        },
      ],
    }));
    const definitions = {
      '#ef4444': defineComposite({
        namespace: 'fixture',
        type: 'datasetBox',
        schema: datasetCompositeSchema,
        compile: redCompile,
      }),
      '#22c55e': defineComposite({
        namespace: 'fixture',
        type: 'datasetBox',
        schema: datasetCompositeSchema,
        compile: greenCompile,
      }),
    } as const;
    const makeDefinition = (contributions: ReadonlyArray<{ color: string }>): AnyCompositeDefinition =>
      definitions[zodEnum(['#ef4444', '#22c55e']).parse(contributions[0].color)];
    const adapter: InputEmbedAdapter<{ color: string }> = {
      kind: 'fixture-cached-dataset',
      lower: props => ({
        node: { namespace: 'fixture', type: 'datasetBox' },
        providerDependencies: {
          roots: [{ capability: 'composite', namespace: 'fixture', type: 'datasetBox' }],
          providers: [
            {
              key: { capability: 'composite', namespace: 'fixture', type: 'datasetBox' },
              params: { color: props.color },
              makeDefinition,
            },
          ],
        },
      }),
    };
    const cachedDatasetScene = (color: '#ef4444' | '#22c55e'): InputScene => ({
      type: 'scene',
      children: [embed({ adapter, id: 'dataset', props: { color } })],
    });
    let rejectNextUpdate = true;
    const rendererFactory = createMemoryRendererFactory('entity', () => {
      const reject = rejectNextUpdate;
      rejectNextUpdate = false;
      return reject;
    });
    const view = mountSceneView(document.createElement('div'), cachedDatasetScene('#ef4444'), {
      runtime: { rendererFactory },
    });

    expect(() => view.replace(cachedDatasetScene('#22c55e'))).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED/,
    );
    expect(greenCompile).toHaveBeenCalledTimes(1);

    view.replace(cachedDatasetScene('#ef4444'));

    expect(redCompile).toHaveBeenCalledTimes(2);
  });

  it('作者输入复用本帧嵌入定义，之后可直接提交 IR', () => {
    const container = document.createElement('div');
    const lower = vi.spyOn(datasetAdapter, 'lower');
    const input = datasetScene('#ef4444');
    const view = mountSceneView(container, input);

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#ef4444');

    expect(lower).toHaveBeenCalledTimes(1);
    view.replace(datasetScene('#22c55e'));

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#22c55e');
    view.replace(source('#3b82f6'));
    expect(view.root.querySelector('[data-retikz-id="changed"]')?.getAttribute('fill')).toBe('#3b82f6');
    expect(lower).toHaveBeenCalledTimes(2);
    view.dispose();
  });

  it('Composite topology 切换复用 renderer，候选失败时保留已提交状态', () => {
    const frames: Array<SceneRuntimeSnapshot> = [];
    const dispose = vi.fn();
    let rejectNextPrepare = false;
    let rendererFactoryCalls = 0;
    const rendererFactory = createMemoryRendererFactory(
      'entity',
      () => rejectNextPrepare,
      undefined,
      undefined,
      dispose,
      snapshot => frames.push(snapshot),
      false,
      () => {
        rendererFactoryCalls += 1;
      },
    );
    const view = mountSceneView(document.createElement('div'), source('#ef4444'), {
      runtime: { rendererFactory },
    });
    const initialCompileResult = view.compileResult;

    view.replace(datasetScene('#22c55e'));

    expect(rendererFactoryCalls).toBe(1);
    expect(frames).toHaveLength(2);
    expect(Number(frames[1]?.revision)).toBe(Number(frames[0]?.revision) + 1);
    expect(view.compileResult).not.toBe(initialCompileResult);
    expect(view.diagnostics()).toEqual([]);

    const committedFrame = frames.at(-1);
    const committedCompileResult = view.compileResult;
    const committedHtml = view.root.innerHTML;

    rejectNextPrepare = true;

    expect(() => view.replace(source('#3b82f6'))).toThrowError(
      expect.objectContaining({ code: RetikzRenderErrorCode.RuntimeRendererPrepareFailed }),
    );

    expect(frames.at(-1)).toBe(committedFrame);
    expect(view.compileResult).toBe(committedCompileResult);
    expect(view.root.innerHTML).toBe(committedHtml);
    expect(view.diagnostics()).toEqual([
      expect.objectContaining({ code: RetikzRenderErrorCode.RuntimeRendererPrepareFailed }),
    ]);

    view.dispose();
    view.dispose();

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('重新挂载时使用新配置中的 Composite 定义', () => {
    const schema = CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('box') });
    const definition = (fill: string) =>
      defineComposite({
        namespace: 'fixture',
        type: 'box',
        schema,
        compile: () => ({ children: [{ type: 'node', position: [0, 0], shape: 'rectangle', style: { fill } }] }),
      });
    const input: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'fixture', type: 'box' }] };
    const container = document.createElement('div');
    for (const fill of ['#ef4444', '#22c55e']) {
      const view = mountSceneView(container, input, { compile: { composites: [definition(fill)] } });
      try {
        expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe(fill);
      } finally {
        view.dispose();
      }
    }
  });

  it('重新水合不改变 renderer 缺省配置', () => {
    const observedCachePolicies: Array<RenderRuntimeConfig['cachePolicy']> = [];
    const view = mountSceneView(
      document.createElement('div'),
      { type: 'scene', children: source('#fff').children },
      {
        runtime: {
          rendererFactory: createMemoryRendererFactory('entity', false, config =>
            observedCachePolicies.push(config.cachePolicy),
          ),
        },
      },
    );
    try {
      view.hydrate({ handlers: {} });
      expect(observedCachePolicies).toEqual([undefined, undefined]);
    } finally {
      view.dispose();
    }
  });

  it('SVG 与 Canvas session initial mount 各只编译一次', () => {
    const compile = vi.fn(() => ({
      children: [
        {
          type: 'node' as const,
          id: 'compiled-once',
          position: [0, 0] as [number, number],
          shape: 'rectangle',
        },
      ],
    }));
    const composite = defineComposite({
      namespace: 'fixture',
      type: 'compileOnce',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('compileOnce'),
      }),
      compile,
    });
    const input: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'fixture', type: 'compileOnce' }],
    };

    for (const renderer of ['svg', 'canvas'] as const) {
      const options: MountOptions = {
        renderer,
        compile: { composites: [composite] },
        output: { width: 100, height: 100 },
      };
      const view = mountSceneView(document.createElement('div'), input, options);
      expect(view.root.tagName.toLowerCase()).toBe(renderer);
      expect(compile).toHaveBeenCalledTimes(1);
      view.dispose();
      compile.mockClear();
    }
  });

  it('IR SVG 使用 session，并保留未变节点 identity', () => {
    const container = document.createElement('div');
    const view = mountSceneView(container, source('#ef4444'));

    const stable = view.root.querySelector('[data-retikz-id="stable"]');

    view.replace(source('#22c55e'));

    expect(view.root.querySelector('[data-retikz-id="stable"]')).toBe(stable);
    expect(view.diagnostics()).toEqual([]);
  });

  it('session full 保留 Session 但每次更新发布 replaceScene', () => {
    const patches: Array<unknown> = [];
    const view = mountSceneView(document.createElement('div'), source('#ef4444'), {
      runtime: {
        updateStrategy: 'full',
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, patch => patches.push(patch)),
      },
    });

    view.replace(source('#22c55e'));

    expect(patches).toEqual([
      expect.objectContaining({ operations: [expect.objectContaining({ kind: 'replaceScene' })] }),
    ]);
    expect(view.diagnostics()).toEqual([]);
  });

  it('session hydrate 以 contribution transaction 添加和移除 handler', () => {
    const container = document.createElement('div');
    const view = mountSceneView(container, source('#ef4444'));
    const handler = vi.fn();
    const hydration = view.hydrate({ handlers: { changed: { click: handler } } });
    const target = view.root.querySelector('[data-retikz-id="changed"]');
    if (target === null) throw new Error('missing session target');

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    hydration.dispose();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('session hydrate 添加失败不泄漏 contribution', () => {
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
    const view = mountSceneView(container, source('#ef4444'), { runtime: { rendererFactory } });
    const rejected = vi.fn();
    const accepted = vi.fn();

    expect(() => view.hydrate({ handlers: { changed: { click: rejected } } })).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED/,
    );

    view.hydrate({ handlers: { changed: { click: accepted } } });

    expect(observedConfigs.at(-1)?.handlerContributions).toEqual([
      expect.objectContaining({ handlers: { changed: { click: accepted } } }),
    ]);
  });

  it('session hydrate 移除失败时 handle 保持 active 并可重试', () => {
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
    const view = mountSceneView(container, source('#ef4444'), { runtime: { rendererFactory } });
    const handler = vi.fn();
    const hydration = view.hydrate({ handlers: { changed: { click: handler } } });

    rejectNextUpdate = true;

    expect(() => hydration.dispose()).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED/,
    );

    hydration.dispose();

    expect(observedContributionCounts).toEqual([0, 1, 0, 0]);
  });

  it('解除注册后可用新的 handlers 接收更新后的事件', () => {
    const container = document.createElement('div');
    const view = mountSceneView(container, source('#ef4444'));
    const first = vi.fn();
    const second = vi.fn();
    const handlers = { changed: { click: first } };
    const original = view.hydrate({ handlers });
    original.dispose();
    view.hydrate({ handlers: { changed: { click: second } } });
    view.replace(source('#22c55e'));
    view.root.querySelector('[data-retikz-id="changed"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    view.dispose();
  });

  it('IR Canvas 使用 session', () => {
    const container = document.createElement('div');
    const session = mountSceneView(container, source('#ef4444'), {
      renderer: 'canvas',
      output: { width: 100, height: 100 },
    });

    expect(session.compileResult).toBeDefined();

    session.dispose();
  });

  it('replace-only renderer 接受完整替换，不报告局部能力回退', () => {
    const container = document.createElement('div');
    const patches: Array<unknown> = [];
    const view = mountSceneView(container, source('#ef4444'), {
      runtime: { rendererFactory: createMemoryRendererFactory('none', false, undefined, patch => patches.push(patch)) },
    });

    view.replace(source('#22c55e'));

    expect(patches).toEqual([
      expect.objectContaining({ operations: [expect.objectContaining({ kind: 'replaceScene' })] }),
    ]);
    expect(view.diagnostics()).toEqual([]);
  });

  it('renderer update 失败时保留已提交的编译结果与画面', () => {
    const container = document.createElement('div');
    const view = mountSceneView(container, source('#ef4444'), {
      compile: {},
      runtime: { rendererFactory: createMemoryRendererFactory('entity', true) },
    });
    const compileResult = view.compileResult;
    const committedHtml = view.root.innerHTML;

    expect(() => view.replace(source('#22c55e'))).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED/,
    );
    expect(view.compileResult).toBe(compileResult);
    expect(view.root.innerHTML).toBe(committedHtml);
  });

  it('session view 重复 dispose 时只重试失败 renderer cleanup', () => {
    const disposeFailure = new Error('dispose failed');
    let remainingFailures = 2;
    const dispose = vi.fn(() => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw disposeFailure;
      }
    });
    const container = document.createElement('div');
    const view = mountSceneView(container, source('#ef4444'), {
      runtime: {
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, undefined, dispose),
      },
    });

    expect(() => view.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(container.contains(view.root)).toBe(false);
    expect(view.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RECONCILER_CLEANUP_FAILED', cause: disposeFailure }),
    ]);
    expect(() => view.replace(source('#22c55e'))).toThrow('Processing controller is disposed');

    expect(() => view.dispose()).not.toThrow();
    expect(() => view.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(3);
  });
});
