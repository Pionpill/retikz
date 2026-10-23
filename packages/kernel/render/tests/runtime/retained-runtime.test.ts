import type { IRScene } from '@retikz/core';
import { isRetikzError } from '@retikz/foundation';
import type { ScenePatch } from '@retikz/reconciler';
import { ReconcilerSession } from '@retikz/reconciler';
import type { ReconcilerPreparedCommit } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';

import type {
  RenderFrameSnapshot,
  RenderRuntimeConfigInput,
  RetainedRendererFactory,
  RetainedRendererRead,
} from '../../src/runtime';
import {
  createRetainedRenderTarget,
  defineRetainedRenderer,
  isRetikzRenderError,
  captureRuntimeConfig,
  RetainedRendererCapability,
  RetikzRenderError,
  RetikzRenderErrorCode,
} from '../../src/runtime';

const scene = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node-a', position: [0, 0], text }],
});

const svgHost = Object.freeze({ tagName: 'svg', namespaceURI: 'http://www.w3.org/2000/svg' }) as SVGSVGElement;

const canvasHost = Object.freeze({ tagName: 'canvas' }) as HTMLCanvasElement;

const noopToken = (): ReconcilerPreparedCommit =>
  Object.freeze({
    commit: () => undefined,
    rollback: () => undefined,
    dispose: () => undefined,
  });

const createRendererHarness = (capability: 'none' | 'group' | 'entity' = 'entity') => {
  let current: RenderFrameSnapshot | undefined;
  const patches: Array<ScenePatch> = [];
  const prepareMount = vi.fn((frame: RenderFrameSnapshot) => {
    const previous = current;
    return Object.freeze({
      commit: () => {
        current = frame;
      },
      rollback: () => {
        current = previous;
      },
      dispose: () => undefined,
    });
  });
  const prepare = vi.fn((patch: ScenePatch, frame: RenderFrameSnapshot) => {
    const previous = current;
    return Object.freeze({
      commit: () => {
        patches.push(patch);
        current = frame;
      },
      rollback: () => {
        current = previous;
      },
      dispose: () => undefined,
    });
  });
  const read = vi.fn(() => {
    if (current === undefined) throw new Error('renderer is not committed');
    return Object.freeze({ frame: current });
  });
  const renderer = defineRetainedRenderer({
    backend: 'svg',
    host: svgHost,
    capability,
    readonlyLayerCapability: 'supported',
    prepareMount,
    prepare,
    read,
    dispose: vi.fn(),
  });

  return { renderer, prepareMount, prepare, read, patches };
};

const createHarness = (capability: 'none' | 'group' | 'entity' = 'entity', initialScene: IRScene = scene('A')) => {
  const renderer = createRendererHarness(capability);
  let config: RenderRuntimeConfigInput = {};
  const factory = vi.fn(() => renderer.renderer) as unknown as RetainedRendererFactory;
  const handle = createRetainedRenderTarget({
    backend: 'svg',
    host: svgHost,
    rendererFactory: factory,
    immutableOptions: { backend: 'svg', idPrefix: 'test' },
    configuration: () => config,
  });
  const session = Object.assign(
    new ReconcilerSession({ onWarn: () => undefined }, { target: handle.target, captureProvenance: true }),
    {
      updateConfig: (next: RenderRuntimeConfigInput) => {
        const previous = config;
        config = next;
        try {
          return session.updateTarget();
        } catch (cause) {
          config = previous;
          throw cause;
        }
      },
    },
  );
  session.mount(initialScene);
  return { renderer, handle, session, factory };
};

describe('@retikz/render/runtime public contract', () => {
  it('公开稳定错误码、具名错误和类型守卫', () => {
    const cause = new Error('invalid patch');
    const details = { source: 'test' };
    const error = new RetikzRenderError({
      code: RetikzRenderErrorCode.ScenePatchInvalid,
      cause,
      details,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RetikzRenderError');
    expect(error.code).toBe(RetikzRenderErrorCode.ScenePatchInvalid);
    expect(error.cause).toBe(cause);
    expect(error.details).toBe(details);
    expect(Object.isFrozen(error.details)).toBe(false);
    expect(isRetikzError(error)).toBe(true);
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzRenderError(error)).toBe(true);
    expect(isRetikzRenderError({ code: RetikzRenderErrorCode.ScenePatchInvalid })).toBe(false);
  });

  it('retains an own undefined cause when omitted', () => {
    const error = new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererDisposed });

    expect(error).toBeInstanceOf(RetikzRenderError);
    expect(error.name).toBe('RetikzRenderError');
    expect(error.message).toBe(RetikzRenderErrorCode.RetainedRendererDisposed);
    expect(error.details).toEqual({ code: RetikzRenderErrorCode.RetainedRendererDisposed });
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(error.cause).toBeUndefined();
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzError(error)).toBe(true);
    expect(isRetikzRenderError(error)).toBe(true);
  });

  it('以判别联合绑定 backend、host 和 immutable options', () => {
    const svgRenderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: RetainedRendererCapability.Entity,
      readonlyLayerCapability: 'supported',
      prepareMount: noopToken,
      prepare: noopToken,
      read: () => {
        throw new Error('unused');
      },
      dispose: () => undefined,
    });

    expect(Object.isFrozen(svgRenderer)).toBe(true);
    expect(svgRenderer).toEqual({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
    });
    expect('read' in svgRenderer).toBe(false);
    expect('prepare' in svgRenderer).toBe(false);
  });

  it('拒绝无法与宿主 provenance 对齐的 renderer backend', () => {
    expect(() =>
      defineRetainedRenderer({
        backend: 'webgl',
        host: canvasHost,
        capability: 'entity',
        readonlyLayerCapability: 'supported',
        prepareMount: noopToken,
        prepare: noopToken,
        read: () => {
          throw new Error('unused');
        },
        dispose: () => undefined,
      } as unknown as Parameters<typeof defineRetainedRenderer>[0]),
    ).toThrowError(expect.objectContaining({ code: RetikzRenderErrorCode.RetainedRendererInvalid }));
  });

  it('把 renderer Proxy getter throw 收敛为稳定 renderer error', () => {
    const getterFailure = new Error('getter failed');
    const input = new Proxy({} as Parameters<typeof defineRetainedRenderer>[0], {
      get: () => {
        throw getterFailure;
      },
    });

    expect(() => defineRetainedRenderer(input)).toThrowError(
      expect.objectContaining({
        code: RetikzRenderErrorCode.RetainedRendererInvalid,
        cause: getterFailure,
      }),
    );
  });
});

describe('captureRuntimeConfig', () => {
  it('复制并递归冻结 config 容器，同时保留 callback identity', () => {
    const click = vi.fn();
    const protoClick = vi.fn();
    const input = {
      handlerContributions: [
        {
          registration: 0,
          handlers: { node: { click }, ['__proto__']: { click: protoClick } },
        },
      ],
      animation: { enabled: true, snapshotAt: 12 },
      canvas: { width: 320, height: 180 },
      cachePolicy: 'static' as const,
    };

    const session = captureRuntimeConfig(input);
    const config = session;

    input.handlerContributions.length = 0;
    input.animation.enabled = false;
    input.canvas.width = 640;

    expect(config.handlerContributions).toHaveLength(1);
    expect(config.animation?.enabled).toBe(true);
    expect(config.canvas).toEqual({ width: 320, height: 180 });
    expect(config.handlerContributions?.[0]?.handlers.node?.click).toBe(click);
    expect(config.handlerContributions?.[0]?.handlers['__proto__']?.click).toBe(protoClick);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.handlerContributions)).toBe(true);
    expect(Object.isFrozen(config.handlerContributions?.[0]?.handlers.node)).toBe(true);
  });

  it('按 registration 排序，并拒绝重复 registration 与非法动态字段', () => {
    const sorted = captureRuntimeConfig({
      handlerContributions: [
        { registration: 2, handlers: {} },
        { registration: 0, handlers: {} },
      ],
    });

    expect(sorted.handlerContributions?.map(item => item.registration)).toEqual([0, 2]);

    for (const input of [
      {
        handlerContributions: [
          { registration: 0, handlers: {} },
          { registration: 0, handlers: {} },
        ],
      },
      { animation: { snapshotAt: Number.NaN } },
      { canvas: { width: -1 } },
      { canvas: { height: Number.POSITIVE_INFINITY } },
    ]) {
      try {
        captureRuntimeConfig(input);
        throw new Error('expected invalid config to fail');
      } catch (error) {
        expect(error).toEqual(
          expect.objectContaining({
            code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid,
          }),
        );
      }
    }
  });

  it('在读取前递归拒绝 config accessor 与非标准数组属性', () => {
    const getter = vi.fn(() => [0, 0, 1, 1]);
    const easings = Object.defineProperty({}, 'custom', {
      enumerable: true,
      get: getter,
    });

    expect(() => captureRuntimeConfig({ animation: { easings } })).toThrow(
      expect.objectContaining({
        code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid,
      }),
    );
    expect(getter).not.toHaveBeenCalled();

    const tuple = [0, 0, 1, 1];
    Object.defineProperty(tuple, Symbol('hidden'), { enumerable: true, value: true });

    expect(() =>
      captureRuntimeConfig({
        animation: { easings: { custom: tuple } },
      } as never),
    ).toThrow(
      expect.objectContaining({
        code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid,
      }),
    );

    const everyGetter = vi.fn(() => Array.prototype.every);
    const tuplePrototype = Object.create(Array.prototype) as object;
    Object.defineProperty(tuplePrototype, 'every', { configurable: true, get: everyGetter });
    const inheritedTuple: [number, number, number, number] = [0, 0, 1, 1];
    Object.setPrototypeOf(inheritedTuple, tuplePrototype);

    expect(() =>
      captureRuntimeConfig({
        animation: { easings: { custom: inheritedTuple } },
      }),
    ).not.toThrow();
    expect(everyGetter).not.toHaveBeenCalled();

    const mapGetter = vi.fn(() => Array.prototype.map);
    const contributionPrototype = Object.create(Array.prototype) as object;
    Object.defineProperty(contributionPrototype, 'map', { configurable: true, get: mapGetter });
    const inheritedContributions = [{ registration: 0, handlers: {} }];
    Object.setPrototypeOf(inheritedContributions, contributionPrototype);

    expect(() =>
      captureRuntimeConfig({
        handlerContributions: inheritedContributions,
      }),
    ).not.toThrow();
    expect(mapGetter).not.toHaveBeenCalled();
  });
});

describe('createRetainedRenderTarget', () => {
  it('首次准备失败后释放尚未取得 lease ownership 的 renderer', () => {
    const dispose = vi.fn();
    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'none',
      readonlyLayerCapability: 'supported',
      prepareMount: () => {
        throw new Error('prepare failed');
      },
      prepare: () => noopToken(),
      read: () => {
        throw new Error('not mounted');
      },
      dispose,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: vi.fn(() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'failed' },
      configuration: () => ({}),
    });
    const session = new ReconcilerSession({}, { target: handle.target, captureProvenance: true });
    expect(() => session.mount(scene('A'))).toThrow();
    session.dispose();
    session.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('initial mount 后只经 session committed cache 暴露 renderer read', () => {
    const { renderer, handle, factory } = createHarness();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(renderer.prepareMount).toHaveBeenCalledTimes(1);
    expect(renderer.read).toHaveBeenCalledTimes(1);

    const first = handle.read();

    expect(first.frame.primary.revision).toBe(0);
    expect(handle.read()).toBe(first);
    expect(renderer.read).toHaveBeenCalledTimes(1);
  });

  it('Core update 原子提交 Patch 与 next snapshot', () => {
    const initial = {
      ...scene('A'),
      children: [{ ...scene('A').children[0], style: { fill: '#ef4444' } }],
    };
    const { renderer, handle, session } = createHarness('entity', initial);
    const previous = handle.read();

    session.replace({
      ...initial,
      children: [{ ...initial.children[0], style: { fill: '#22c55e' } }],
    });

    const next = handle.read();

    expect(next).not.toBe(previous);
    expect(next.frame.primary.revision).toBe(1);
    expect(renderer.prepare).toHaveBeenCalledTimes(1);
    expect(renderer.read).toHaveBeenCalledTimes(2);
    expect(renderer.patches[0]).toMatchObject({ baseRevision: 0, nextRevision: 1 });
    expect(renderer.patches[0]?.operations[0]?.kind).toBe('replaceScene');
  });

  it('config-only update 以 empty Patch 连续推进 lineage，prepare 前不调用 read', () => {
    const { renderer, handle, session } = createHarness();
    const callsBefore = renderer.read.mock.calls.length;

    session.updateConfig({
      animation: { enabled: false },
      cachePolicy: 'dynamic',
    });

    expect(renderer.prepare).toHaveBeenCalledTimes(1);
    expect(renderer.prepare.mock.invocationCallOrder[0]).toBeLessThan(
      renderer.read.mock.invocationCallOrder.at(-1) ?? 0,
    );
    expect(renderer.read).toHaveBeenCalledTimes(callsBefore + 1);
    expect(renderer.patches[0]).toEqual({ baseRevision: 0, nextRevision: 1, operations: [] });
    expect(handle.read().frame.primary.revision).toBe(1);
  });

  it('renderer read 与 committed lineage 不一致时回滚并保留旧 public read', () => {
    const renderer = createRendererHarness();
    const originalRead = renderer.renderer;
    void originalRead;

    let stale: RenderFrameSnapshot | undefined;
    const mismatching = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: frame => {
        stale = frame;
        return noopToken();
      },
      prepare: () => noopToken(),
      read: () => {
        if (stale === undefined) throw new Error('missing snapshot');
        return Object.freeze({ frame: stale });
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => mismatching) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'stale' },
      configuration: () => ({}),
    });

    const session = new ReconcilerSession(
      { onWarn: () => undefined },
      { target: handle.target, captureProvenance: true },
    );
    session.mount(scene('A'));
    const before = handle.read();

    expect(() => session.replace(scene('B'))).toThrowError(RetikzRenderError);
    expect(session.read().revision).toBe(0);
    expect(handle.read()).toBe(before);
  });

  it('结构等价但可变的第三方 snapshot 不会泄漏到 committed public read', () => {
    let committed: RenderFrameSnapshot | undefined;
    let exposedClone: RenderFrameSnapshot | undefined;
    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: frame => {
        committed = frame;
        return noopToken();
      },
      prepare: (_patch, frame) => {
        committed = frame;
        return noopToken();
      },
      read: () => {
        if (committed === undefined) throw new Error('missing committed snapshot');
        exposedClone = structuredClone(committed);
        return { frame: exposedClone };
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'mutable-read' },
      configuration: () => ({}),
    });

    const session = new ReconcilerSession(
      { onWarn: () => undefined },
      { target: handle.target, captureProvenance: true },
    );
    session.mount(scene('A'));
    const read = handle.read();
    if (exposedClone === undefined) throw new Error('expected renderer clone');

    (exposedClone as unknown as { primary: { scene: { layout: { width: number } } } }).primary.scene.layout.width = 999;

    expect(read.frame).not.toBe(exposedClone);
    expect(read.frame.primary.scene.layout.width).not.toBe(999);
    expect(Object.isFrozen(read.frame.primary.scene.layout)).toBe(true);
  });

  it('invalid renderer cleanup throw 不覆盖稳定 primary error', () => {
    const disposeFailure = new Error('cleanup failed');
    const mismatching = defineRetainedRenderer({
      backend: 'canvas',
      host: canvasHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: noopToken,
      prepare: noopToken,
      read: () => {
        throw new Error('unused');
      },
      dispose: () => {
        throw disposeFailure;
      },
    });

    try {
      createRetainedRenderTarget({
        backend: 'svg',
        host: svgHost,
        rendererFactory: (() => mismatching) as unknown as RetainedRendererFactory,
        immutableOptions: { backend: 'svg', idPrefix: 'mismatch' },
        configuration: () => ({}),
      });
      throw new Error('expected renderer mismatch');
    } catch (error) {
      expect(error).toEqual(
        expect.objectContaining({
          code: RetikzRenderErrorCode.RetainedRendererInvalid,
          cause: expect.objectContaining({ renderer: mismatching, disposeFailure }),
        }),
      );
    }
  });

  it('公开 Runtime 仅重试失败 renderer cleanup，成功后进入幂等 disposed 状态', () => {
    const disposeFailure = new Error('dispose rejected');
    let remainingFailures = 2;
    const dispose = vi.fn(() => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw disposeFailure;
      }
    });
    let current: RenderFrameSnapshot | undefined;

    const prepare = (frame: RenderFrameSnapshot): ReconcilerPreparedCommit => {
      const previous = current;
      return Object.freeze({
        commit: () => {
          current = frame;
        },
        rollback: () => {
          current = previous;
        },
        dispose: () => undefined,
      });
    };

    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: prepare,
      prepare: (_patch, frame) => prepare(frame),
      read: () => {
        if (current === undefined) throw new Error('renderer is not committed');
        return Object.freeze({ frame: current });
      },
      dispose,
    });

    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'dispose-retry' },
      configuration: () => ({}),
    });

    const session = new ReconcilerSession(
      { onWarn: () => undefined },
      { target: handle.target, captureProvenance: true },
    );
    session.mount(scene('dispose'));

    expect(() => session.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RECONCILER_CLEANUP_FAILED', cause: disposeFailure }),
    ]);
    expect(() => handle.read()).toThrowError(
      expect.objectContaining({ code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch }),
    );

    expect(() => session.dispose()).not.toThrow();
    expect(() => session.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(3);
  });

  it('在 factory 前拒绝 backend/host mismatch，并以 Render error 暴露 cause', () => {
    const factory = vi.fn();

    expect(() =>
      createRetainedRenderTarget({
        backend: 'svg',
        host: Object.freeze({ tagName: 'canvas' }) as unknown as SVGSVGElement,
        rendererFactory: factory as RetainedRendererFactory,
        immutableOptions: { backend: 'svg', idPrefix: 'invalid' },
        configuration: () => ({}),
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRenderErrorCode.RetainedRenderParticipantInputInvalid }));
    expect(factory).not.toHaveBeenCalled();
  });

  it('把 participant options getter throw 收敛为稳定 input error', () => {
    const getterFailure = new Error('options getter failed');
    const options = new Proxy({} as Parameters<typeof createRetainedRenderTarget>[0], {
      get: () => {
        throw getterFailure;
      },
    });

    expect(() => createRetainedRenderTarget(options)).toThrowError(
      expect.objectContaining({
        code: RetikzRenderErrorCode.RetainedRenderParticipantInputInvalid,
        cause: getterFailure,
      }),
    );
  });

  it('把 renderer 未知 prepare throw 包装为稳定 RetikzRenderError cause', () => {
    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: () => {
        throw new Error('renderer failed');
      },
      prepare: noopToken,
      read: () => {
        throw new Error('unused');
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'throw' },
      configuration: () => ({}),
    });

    try {
      new ReconcilerSession({ onWarn: () => undefined }, { target: handle.target, captureProvenance: true }).mount(
        scene('A'),
      );
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRenderError);

      const runtime = error as RetikzRenderError;

      expect(runtime.code).toBe(RetikzRenderErrorCode.RetainedRendererPrepareFailed);
      expect(runtime.cause).toEqual(expect.objectContaining({ message: 'renderer failed' }));
    }
  });

  it('保留 renderer prepare 已抛出的 RetikzRenderError identity 与 code', () => {
    const expected = new RetikzRenderError({
      code: RetikzRenderErrorCode.ScenePatchInvalid,
      cause: Object.freeze({ fixture: true }),
    });

    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: () => {
        throw expected;
      },
      prepare: noopToken,
      read: () => {
        throw new Error('unused');
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'retained-error' },
      configuration: () => ({}),
    });

    try {
      new ReconcilerSession({ onWarn: () => undefined }, { target: handle.target, captureProvenance: true }).mount(
        scene('A'),
      );
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRenderError);
      expect(error).toBe(expected);
    }
  });

  it('把 renderer read getter throw 包装为稳定 snapshot mismatch cause', () => {
    const getterFailure = new Error('read getter failed');

    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: noopToken,
      prepare: noopToken,
      read: () =>
        new Proxy({} as RetainedRendererRead, {
          get: () => {
            throw getterFailure;
          },
        }),
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'read-getter' },
      configuration: () => ({}),
    });

    try {
      new ReconcilerSession({ onWarn: () => undefined }, { target: handle.target, captureProvenance: true }).mount(
        scene('A'),
      );
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRenderError);

      const runtime = error as RetikzRenderError;

      expect(runtime.code).toBe(RetikzRenderErrorCode.ScenePatchSnapshotMismatch);
      expect(runtime.cause).toBe(getterFailure);
    }
  });

  it('在 publish 前拒绝 malformed AnimationControls', () => {
    let committed: RenderFrameSnapshot | undefined;
    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: frame => {
        committed = frame;
        return noopToken();
      },
      prepare: noopToken,
      read: () => {
        if (committed === undefined) throw new Error('missing snapshot');
        return { frame: committed, animation: {} as NonNullable<RetainedRendererRead['animation']> };
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'malformed-animation' },
      configuration: () => ({}),
    });

    expect(() =>
      new ReconcilerSession({ onWarn: () => undefined }, { target: handle.target, captureProvenance: true }).mount(
        scene('A'),
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRenderErrorCode.RetainedRendererInvalid,
      }),
    );
  });

  it('固定捕获 AnimationControls callback 与 data state，不保留可变容器 alias', () => {
    let committed: RenderFrameSnapshot | undefined;
    const originalPlay = vi.fn();
    const replacementPlay = vi.fn();
    const controls = {
      play: originalPlay,
      pause: vi.fn(),
      seek: vi.fn(),
      dispose: vi.fn(),
      time: 12,
      running: false,
    };
    const renderer = defineRetainedRenderer({
      backend: 'svg',
      host: svgHost,
      capability: 'entity',
      readonlyLayerCapability: 'supported',
      prepareMount: frame => {
        committed = frame;
        return noopToken();
      },
      prepare: noopToken,
      read: () => {
        if (committed === undefined) throw new Error('missing snapshot');
        return { frame: committed, animation: controls };
      },
      dispose: () => undefined,
    });
    const handle = createRetainedRenderTarget({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'animation-capture' },
      configuration: () => ({}),
    });

    const session = new ReconcilerSession(
      { onWarn: () => undefined },
      { target: handle.target, captureProvenance: true },
    );
    session.mount(scene('A'));
    const animation = handle.read().animation;
    if (animation === undefined) throw new Error('expected animation controls');

    controls.play = replacementPlay;
    controls.time = 99;
    animation.play();

    expect(originalPlay).toHaveBeenCalledTimes(1);
    expect(replacementPlay).not.toHaveBeenCalled();
    expect(animation.time).toBe(12);
    expect(Object.isFrozen(animation)).toBe(true);
  });
});
