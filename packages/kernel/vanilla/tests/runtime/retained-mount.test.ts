import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { ReconcilerPreparedCommit } from '@retikz/reconciler';
import type {
  InputRetainedRendererFactory,
  RenderFrameSnapshot,
  RenderRuntimeConfig,
  RetainedRendererFactory,
} from '@retikz/render/runtime';
import { defineRetainedRenderer, RetikzRenderErrorCode } from '@retikz/render/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { literal, string, enum as zodEnum } from 'zod';

import type { InputEmbedAdapter, InputScene, VanillaCompileResultExtension } from '../../src';
import { embed } from '../../src';
import { mountCanvas, mountSvg } from '../../src/dom';

// @vitest-environment jsdom
import { compileTestResult } from '../helpers/compilation';

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

const inputScene = (fill: string): InputScene => ({
  type: 'scene',
  children: source(fill).children,
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
  onCreate?: () => void,
): RetainedRendererFactory =>
  ((input: InputRetainedRendererFactory) => {
    onCreate?.();
    let current: RenderFrameSnapshot | undefined;

    const prepare = (frame: RenderFrameSnapshot): ReconcilerPreparedCommit => {
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

const failingResultExtension: VanillaCompileResultExtension = {
  create: input => ({
    resolve: () => {
      if (input.authoringSites[0]?.authoring === 'fail') throw new Error('expected compile result extension failure');
      return [];
    },
  }),
};

const extensionScene = (authoring: unknown): InputScene => ({
  type: 'scene',
  authoring,
  children: [{ type: 'node', id: 'box', position: [0, 0], shape: 'rectangle' }],
});

beforeEach(() => {
  const context = createRecordingContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('@retikz/vanilla 保留安装座', () => {
  it('编译结果扩展解析失败时保留上一帧和已提交的 artifacts', () => {
    const frames: Array<RenderFrameSnapshot> = [];
    const view = mountSvg(document.createElement('div'), extensionScene(true), {
      compileResultExtension: failingResultExtension,
      runtime: {
        rendererFactory: createMemoryRendererFactory('entity', false, undefined, undefined, undefined, frame =>
          frames.push(frame),
        ),
      },
    });
    const artifacts = view.artifacts;
    const committedFrame = frames.at(-1);

    expect(() => view.update(extensionScene('fail'))).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED|Vanilla compile result extension resolve failed/,
    );
    expect(frames.at(-1)).toBe(committedFrame);
    expect(view.artifacts).toBe(artifacts);
    expect(() => view.update(extensionScene(false))).not.toThrow();

    view.dispose();
  });

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
    const view = mountSvg(document.createElement('div'), cachedDatasetScene('#ef4444'), {
      runtime: { rendererFactory },
    });

    expect(() => view.update(cachedDatasetScene('#22c55e'))).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED|Vanilla compile result extension resolve failed/,
    );
    expect(greenCompile).toHaveBeenCalledTimes(1);

    view.update(cachedDatasetScene('#ef4444'));

    expect(redCompile).toHaveBeenCalledTimes(2);
  });

  it('InputScene update 使用本次 normalization 生成的 composite definitions', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, datasetScene('#ef4444'));

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#ef4444');

    view.update(datasetScene('#22c55e'));

    expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe('#22c55e');
  });

  it('Composite topology 切换复用 renderer，候选失败时保留已提交状态', () => {
    const frames: Array<RenderFrameSnapshot> = [];
    const dispose = vi.fn();
    let rejectNextPrepare = false;
    let rendererFactoryCalls = 0;
    const rendererFactory = createMemoryRendererFactory(
      'entity',
      () => rejectNextPrepare,
      undefined,
      undefined,
      dispose,
      frame => frames.push(frame),
      false,
      () => {
        rendererFactoryCalls += 1;
      },
    );
    const view = mountSvg(document.createElement('div'), source('#ef4444'), {
      runtime: { rendererFactory },
    });
    const initialCompileResult = view.compileResult;

    view.update(datasetScene('#22c55e'));

    expect(rendererFactoryCalls).toBe(1);
    expect(frames).toHaveLength(2);
    expect(Number(frames[1]?.primary.revision)).toBe(Number(frames[0]?.primary.revision) + 1);
    expect(view.compileResult).not.toBe(initialCompileResult);
    expect(view.diagnostics()).toEqual([]);

    const committedFrame = frames.at(-1);
    const committedCompileResult = view.compileResult;
    const committedHtml = view.root.innerHTML;

    rejectNextPrepare = true;

    expect(() => view.update(source('#3b82f6'))).toThrowError(
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
      const view = mountSvg(container, input, { compile: { composites: [definition(fill)] } });
      try {
        expect(view.root.querySelector('rect')?.getAttribute('fill')).toBe(fill);
      } finally {
        view.dispose();
      }
    }
  });

  it('重新水合不改变 renderer 缺省配置', () => {
    const observedCachePolicies: Array<RenderRuntimeConfig['cachePolicy']> = [];
    const view = mountSvg(
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

  it('SVG 与 Canvas retained initial mount 各只编译一次', () => {
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

    const svg = mountSvg(document.createElement('div'), input, { compile: { composites: [composite] } });

    expect(compile).toHaveBeenCalledTimes(1);

    svg.dispose();
    compile.mockClear();

    const canvas = mountCanvas(document.createElement('div'), input, {
      compile: { composites: [composite] },
      output: { width: 100, height: 100 },
    });

    expect(compile).toHaveBeenCalledTimes(1);

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

  it('IR/InputScene SVG static view 完整重绘、复用 root 并更新 artifacts', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'), {
      runtime: { mode: 'static' },
      compile: {},
    });
    const root = view.root;

    view.update(inputScene('#22c55e'));

    expect(view.mode).toBe('static');
    expect(view.root).toBe(root);
    expect(view.root.querySelector('[data-retikz-id="changed"]')?.getAttribute('fill')).toBe('#22c55e');
    expect(view.artifacts).toEqual([]);
  });

  it('IR/InputScene Canvas static view 完整重绘并复用 root', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, source('#ef4444'), {
      runtime: { mode: 'static' },
      output: { width: 100, height: 100 },
    });
    const root = view.root;

    view.update(inputScene('#22c55e'));

    expect(view.mode).toBe('static');
    expect(view.root).toBe(root);
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

  it('raw static compile 失败保留旧 view，materialization 失败同步抛出', () => {
    const view = mountSvg(document.createElement('div'), source('#ef4444'), {
      runtime: { mode: 'static' },
      compile: {},
    });
    const html = view.root.innerHTML;
    const artifacts = view.artifacts;
    const invalid: IRScene = {
      ...source('#22c55e'),
      children: [{ type: 'node', id: 'invalid', position: [0, 0], shape: 'missing-shape' }],
    };

    expect(() => view.update(invalid)).toThrow();
    expect(view.root.innerHTML).toBe(html);
    expect(view.artifacts).toBe(artifacts);

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
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED|Vanilla compile result extension resolve failed/,
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

    expect(() => hydration.dispose()).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED|Vanilla compile result extension resolve failed/,
    );

    hydration.dispose();

    expect(observedContributionCounts).toEqual([0, 1, 0, 0]);
  });

  it('解除注册后可用新的 handlers 接收更新后的事件', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'));
    const first = vi.fn();
    const second = vi.fn();
    const handlers = { changed: { click: first } };
    const original = view.hydrate({ handlers });
    original.dispose();
    view.hydrate({ handlers: { changed: { click: second } } });
    view.update(source('#22c55e'));
    view.root.querySelector('[data-retikz-id="changed"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    view.dispose();
  });

  it('预编译 Scene 保持 static view', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, compileTestResult(source('#ef4444')).scene);

    expect(view.mode).toBe('static');
  });

  it('IR Canvas 使用 retained session，预编译 Scene 使用 static view', () => {
    const retainedContainer = document.createElement('div');
    const retained = mountCanvas(retainedContainer, source('#ef4444'), { output: { width: 100, height: 100 } });
    const staticContainer = document.createElement('div');
    const staticView = mountCanvas(staticContainer, compileTestResult(source('#ef4444')).scene);

    expect(retained.mode).toBe('retained');
    expect(staticView.mode).toBe('static');

    retained.dispose();
    staticView.dispose();
  });

  it('replace-only renderer 接受完整替换，不报告局部能力回退', () => {
    const container = document.createElement('div');
    const patches: Array<unknown> = [];
    const view = mountSvg(container, source('#ef4444'), {
      runtime: { rendererFactory: createMemoryRendererFactory('none', false, undefined, patch => patches.push(patch)) },
    });

    view.update(source('#22c55e'));

    expect(patches).toEqual([
      expect.objectContaining({ operations: [expect.objectContaining({ kind: 'replaceScene' })] }),
    ]);
    expect(view.diagnostics()).toEqual([]);
  });

  it('renderer update 失败时保留 committed artifacts 与编译结果', () => {
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'), {
      compile: {},
      runtime: { rendererFactory: createMemoryRendererFactory('entity', true) },
    });
    const artifacts = view.artifacts;
    const compileResult = view.compileResult;
    const committedHtml = view.root.innerHTML;

    expect(() => view.update(source('#22c55e'))).toThrow(
      /Failed to publish the compilation|RENDER_RUNTIME_RENDERER_PREPARE_FAILED|Vanilla compile result extension resolve failed/,
    );
    expect(view.artifacts).toBe(artifacts);
    expect(view.compileResult).toBe(compileResult);
    expect(view.root.innerHTML).toBe(committedHtml);
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
    const container = document.createElement('div');
    const view = mountSvg(container, source('#ef4444'), {
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
    expect(() => view.update(source('#22c55e'))).toThrow('Processing controller is disposed');

    expect(() => view.dispose()).not.toThrow();
    expect(() => view.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(3);
  });
});
