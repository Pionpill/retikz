import type { CoreProgramDefinition, IRScene, ScenePatch, SceneRuntimeSnapshot } from '@retikz/core';
import type { PerformanceTraceRecord, RuntimePreparedCommit } from '@retikz/runtime';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import { isRetikzError } from '@retikz/foundation';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeOwner,
  defineRuntimeProgram,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RetikzRuntimeError,
  RetikzRuntimeErrorCode,
  RuntimeProgramKind,
} from '@retikz/runtime';
import { describe, expect, it, vi } from 'vitest';

import type {
  RenderFrameSnapshot,
  RenderRuntimeConfigInput,
  RetainedRendererFactory,
  RetainedRendererRead,
} from '../../src/runtime';

import {
  createRetainedRenderParticipant,
  defineRetainedRenderer,
  isRetikzRetainedRenderError,
  RenderRuntimeOwnerDefinition,
  RetainedRendererCapability,
  RetikzRetainedRenderError,
  RetikzRetainedRenderErrorCode,
} from '../../src/runtime';

const scene = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node-a', position: [0, 0], text }],
});

const svgHost = Object.freeze({ tagName: 'svg', namespaceURI: 'http://www.w3.org/2000/svg' }) as SVGSVGElement;
const canvasHost = Object.freeze({ tagName: 'canvas' }) as HTMLCanvasElement;

const noopToken = (): RuntimePreparedCommit =>
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

const createHarness = (
  capability: 'none' | 'group' | 'entity' = 'entity',
  initialScene: IRScene = scene('A'),
  runtimeOptions: Readonly<{
    updateStrategy?: 'auto' | 'full';
    trace?: (record: PerformanceTraceRecord) => void;
  }> = {},
) => {
  const renderer = createRendererHarness(capability);
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const factory = vi.fn(() => renderer.renderer) as unknown as RetainedRendererFactory;
  const handle = createRetainedRenderParticipant({
    backend: 'svg',
    host: svgHost,
    rendererFactory: factory,
    immutableOptions: { backend: 'svg', idPrefix: 'test' },
    coreProgram,
  });
  const owners = createRuntimeOwnerRegistry({
    builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition],
  });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const session = createRuntimeSession({
    owners,
    programs,
    ...runtimeOptions,
    participants: [handle.participant],
    initialSnapshots: [
      createRuntimeOwnerInput(CoreOwnerDefinition, initialScene),
      createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
    ],
  });
  return { renderer, coreProgram, handle, session, factory };
};

describe('@retikz/render/runtime public contract', () => {
  it('公开稳定错误码、具名错误和类型守卫', () => {
    const cause = new Error('invalid patch');
    const details = { source: 'test' };
    const error = new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.ScenePatchInvalid,
      cause,
      details,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RetikzRetainedRenderError');
    expect(error.code).toBe(RetikzRetainedRenderErrorCode.ScenePatchInvalid);
    expect(error.cause).toBe(cause);
    expect(error.details).toBe(details);
    expect(Object.isFrozen(error.details)).toBe(false);
    expect(isRetikzError(error)).toBe(true);
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzRetainedRenderError(error)).toBe(true);
    expect(isRetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.ScenePatchInvalid })).toBe(false);
  });

  it('retains an own undefined cause when omitted', () => {
    const error = new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererDisposed });

    expect(error).toBeInstanceOf(RetikzRetainedRenderError);
    expect(error.name).toBe('RetikzRetainedRenderError');
    expect(error.message).toBe(RetikzRetainedRenderErrorCode.RetainedRendererDisposed);
    expect(error.details).toEqual({});
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(Object.hasOwn(error, 'cause')).toBe(true);
    expect(error.cause).toBeUndefined();
    expect(Object.getOwnPropertyNames(error)).toContain('cause');
    expect(isRetikzError(error)).toBe(true);
    expect(isRetikzRetainedRenderError(error)).toBe(true);
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
    ).toThrowError(expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid }));
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
        code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid,
        cause: getterFailure,
      }),
    );
  });
});

describe('RenderRuntimeOwnerDefinition', () => {
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
    const owners = createRuntimeOwnerRegistry({ builtins: [RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, input)],
    });
    const config = session.snapshot(RenderRuntimeOwnerDefinition).value;

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
    const owners = createRuntimeOwnerRegistry({ builtins: [RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [] });
    const sorted = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {
          handlerContributions: [
            { registration: 2, handlers: {} },
            { registration: 0, handlers: {} },
          ],
        }),
      ],
    });
    expect(
      sorted.snapshot(RenderRuntimeOwnerDefinition).value.handlerContributions?.map(item => item.registration),
    ).toEqual([0, 2]);

    for (const input of [
      {
        handlerContributions: [
          { registration: 0, handlers: {} },
          { registration: 0, handlers: {} },
        ],
      },
      { cachePolicy: 'forever' },
      { animation: { snapshotAt: Number.NaN } },
      { canvas: { width: -1 } },
      { canvas: { height: Number.POSITIVE_INFINITY } },
      { animation: new Date() },
      { handlerContributions: [{ registration: 0, handlers: new Date() }] },
    ]) {
      try {
        createRuntimeSession({
          owners,
          programs,
          initialSnapshots: [
            createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, input as unknown as RenderRuntimeConfigInput),
          ],
        });
        throw new Error('expected invalid config to fail');
      } catch (error) {
        expect(error).toEqual(
          expect.objectContaining({
            cause: expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
          }),
        );
      }
    }
  });

  it('在读取前递归拒绝 config accessor 与非标准数组属性', () => {
    const owners = createRuntimeOwnerRegistry({ builtins: [RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [] });
    const getter = vi.fn(() => [0, 0, 1, 1]);
    const easings = Object.defineProperty({}, 'custom', {
      enumerable: true,
      get: getter,
    });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, { animation: { easings } })],
      }),
    ).toThrow(
      expect.objectContaining({
        cause: expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
      }),
    );
    expect(getter).not.toHaveBeenCalled();

    const tuple = [0, 0, 1, 1];
    Object.defineProperty(tuple, Symbol('hidden'), { enumerable: true, value: true });
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {
            animation: { easings: { custom: tuple } },
          } as never),
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        cause: expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
      }),
    );

    const everyGetter = vi.fn(() => Array.prototype.every);
    const tuplePrototype = Object.create(Array.prototype) as object;
    Object.defineProperty(tuplePrototype, 'every', { configurable: true, get: everyGetter });
    const inheritedTuple: [number, number, number, number] = [0, 0, 1, 1];
    Object.setPrototypeOf(inheritedTuple, tuplePrototype);
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {
            animation: { easings: { custom: inheritedTuple } },
          }),
        ],
      }),
    ).not.toThrow();
    expect(everyGetter).not.toHaveBeenCalled();

    const mapGetter = vi.fn(() => Array.prototype.map);
    const contributionPrototype = Object.create(Array.prototype) as object;
    Object.defineProperty(contributionPrototype, 'map', { configurable: true, get: mapGetter });
    const inheritedContributions = [{ registration: 0, handlers: {} }];
    Object.setPrototypeOf(inheritedContributions, contributionPrototype);
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {
            handlerContributions: inheritedContributions,
          }),
        ],
      }),
    ).not.toThrow();
    expect(mapGetter).not.toHaveBeenCalled();
  });
});

describe('createRetainedRenderParticipant', () => {
  it('initial mount 后只经 session committed cache 暴露 renderer read', () => {
    const { renderer, handle, session, factory } = createHarness();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(renderer.prepareMount).toHaveBeenCalledTimes(1);
    expect(renderer.read).toHaveBeenCalledTimes(1);
    const first = handle.read(session);
    expect(first.frame.primary.revision).toBe(0);
    expect(handle.read(session)).toBe(first);
    expect(renderer.read).toHaveBeenCalledTimes(1);
  });

  it('Core update 原子提交 Patch 与 next snapshot', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const initial = {
      ...scene('A'),
      children: [{ ...scene('A').children[0], fill: '#ef4444' }],
    };
    const { renderer, handle, session } = createHarness('entity', initial, {
      trace: record => records.push(record),
    });
    const previous = handle.read(session);
    records.length = 0;

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(CoreOwnerDefinition, {
          ...initial,
          children: [{ ...initial.children[0], fill: '#22c55e' }],
        }),
      ],
    });

    const next = handle.read(session);
    expect(next).not.toBe(previous);
    expect(next.frame.primary.revision).toBe(1);
    expect(renderer.prepare).toHaveBeenCalledTimes(1);
    expect(renderer.read).toHaveBeenCalledTimes(2);
    expect(renderer.patches[0]).toMatchObject({ baseRevision: 0, nextRevision: 1 });
    expect(renderer.patches[0]?.operations[0]?.kind).toBe('update');
    expect(
      records.filter(
        record => record.owner === '@retikz/render:svg' && record.unit === PerformanceTraceUnit.SceneChange,
      ),
    ).toEqual([
      expect.objectContaining({
        phase: PerformanceTracePhase.Update,
        outcome: PerformanceTraceOutcome.Incremental,
      }),
    ]);
  });

  it('直接 replaceScene 物化记录为 full，不伪报 incremental 或 fallback', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const { renderer, coreProgram, session } = createHarness('entity', scene('A'), {
      updateStrategy: 'full',
      trace: record => records.push(record),
    });
    records.length = 0;

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(CoreOwnerDefinition, {
          ...scene('A'),
          children: [{ ...scene('A').children[0], fill: '#22c55e' }],
        }),
      ],
    });

    expect(session.artifact(coreProgram).value.patch?.operations[0]?.kind).toBe('replaceScene');
    expect(renderer.patches[0]?.operations[0]?.kind).toBe('replaceScene');
    expect(
      records.filter(
        record => record.owner === '@retikz/render:svg' && record.unit === PerformanceTraceUnit.SceneChange,
      ),
    ).toEqual([
      expect.objectContaining({
        phase: PerformanceTracePhase.Update,
        outcome: PerformanceTraceOutcome.Full,
      }),
    ]);
  });

  it('config-only update 以 empty Patch 连续推进 lineage，prepare 前不调用 read', () => {
    const { renderer, handle, session } = createHarness();
    const callsBefore = renderer.read.mock.calls.length;

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          animation: { enabled: false },
          cachePolicy: 'dynamic',
        }),
      ],
    });

    expect(renderer.prepare).toHaveBeenCalledTimes(1);
    expect(renderer.prepare.mock.invocationCallOrder[0]).toBeLessThan(
      renderer.read.mock.invocationCallOrder.at(-1) ?? 0,
    );
    expect(renderer.read).toHaveBeenCalledTimes(callsBefore + 1);
    expect(renderer.patches[0]).toEqual({ baseRevision: 0, nextRevision: 1, operations: [] });
    expect(handle.read(session).frame.primary.revision).toBe(1);
  });

  it('合法但 capability 不支持的 Patch 在 renderer 调用前转换为独占 replace 并报告 warning', () => {
    const initial = { ...scene('A'), children: [{ ...scene('A').children[0], fill: '#ef4444' }] };
    const records: Array<PerformanceTraceRecord> = [];
    const { renderer, coreProgram, session } = createHarness('none', initial, {
      trace: record => records.push(record),
    });
    session.diagnostics();
    records.length = 0;

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(CoreOwnerDefinition, {
          ...initial,
          children: [{ ...initial.children[0], fill: '#22c55e' }],
        }),
      ],
    });

    expect(session.artifact(coreProgram).value.patch?.operations[0]?.kind).toBe('update');
    expect(renderer.patches[0]?.operations).toEqual([
      expect.objectContaining({ kind: 'replaceScene', snapshot: expect.objectContaining({ revision: 1 }) }),
    ]);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({
        owner: '@retikz/render:svg',
        code: 'RETAINED_RENDERER_CAPABILITY_FALLBACK',
        phase: 'prepare',
      }),
    ]);
    expect(
      records.filter(
        record => record.owner === '@retikz/render:svg' && record.unit === PerformanceTraceUnit.SceneChange,
      ),
    ).toEqual([
      expect.objectContaining({
        phase: PerformanceTracePhase.Update,
        outcome: PerformanceTraceOutcome.Fallback,
      }),
    ]);
  });

  it('group capability 保留 stable Group subtree update，不产生 fallback warning', () => {
    const initial = { ...scene('A'), children: [{ ...scene('A').children[0], fill: '#ef4444' }] };
    const { renderer, coreProgram, session } = createHarness('group', initial);
    session.diagnostics();

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(CoreOwnerDefinition, {
          ...initial,
          children: [{ ...initial.children[0], fill: '#22c55e' }],
        }),
      ],
    });

    expect(session.artifact(coreProgram).value.patch?.operations[0]?.kind).toBe('update');
    expect(renderer.patches[0]?.operations[0]?.kind).toBe('update');
    expect(session.diagnostics()).toEqual([]);
  });

  it('validator failure 发生在 renderer prepare 与 fallback trace/warning 之前', () => {
    const sourceOwner = defineRuntimeOwner<boolean, boolean, boolean, never>({
      key: '@test/render-validator-source',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const root = Object.freeze({ owner: '@test/render-validator', path: Object.freeze(['root']) });
    const snapshot = (revision: number, invalid: boolean): SceneRuntimeSnapshot =>
      Object.freeze({
        revision: revision as SceneRuntimeSnapshot['revision'],
        root: invalid ? { owner: '@test/render-validator', path: [] } : root,
        scene: Object.freeze({
          layout: Object.freeze({ x: 0, y: 0, width: 10, height: 10 }),
          primitives: Object.freeze([]),
          resources: Object.freeze([]),
          animations: Object.freeze([]),
        }),
        topology: Object.freeze([]),
      });
    const artifact = (current: SceneRuntimeSnapshot, patch?: ScenePatch) =>
      Object.freeze({
        snapshot: current,
        output: Object.freeze({
          result: Object.freeze({ scene: current.scene, artifacts: Object.freeze([]) }),
          diagnostics: Object.freeze([]),
        }),
        ...(patch === undefined ? {} : { patch }),
      });
    const program = defineRuntimeProgram({
      id: Object.freeze({ owner: sourceOwner.key, key: 'compile' }),
      owners: [sourceOwner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: artifact(snapshot(view.candidateRevision, false)) }),
      update: (_previous, view) => {
        const next = snapshot(view.candidateRevision, view.snapshot(sourceOwner).value);
        if (view.baseRevision === undefined) throw new Error('expected update base revision');
        return {
          kind: RuntimeProgramKind.Incremental,
          artifact: artifact(
            next,
            Object.freeze({
              baseRevision: view.baseRevision,
              nextRevision: view.candidateRevision,
              operations: Object.freeze([]),
            }),
          ),
        };
      },
    }) as unknown as CoreProgramDefinition<readonly []>;
    const renderer = createRendererHarness('none');
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer.renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'validator-first' },
      coreProgram: program,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [sourceOwner, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const records: Array<PerformanceTraceRecord> = [];
    const session = createRuntimeSession({
      owners,
      programs,
      trace: record => records.push(record),
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(sourceOwner, false),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });
    records.length = 0;

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(sourceOwner, true)],
      }),
    ).toThrowError(RetikzRuntimeError);
    expect(renderer.prepare).not.toHaveBeenCalled();
    expect(records).toEqual([]);
    expect(session.diagnostics()).toEqual([]);
  });

  it('renderer read 与 committed lineage 不一致时回滚并保留旧 public read', () => {
    const renderer = createRendererHarness();
    const originalRead = renderer.renderer;
    void originalRead;
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => mismatching) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'stale' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const session = createRuntimeSession({
      owners,
      programs,
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });
    const before = handle.read(session);

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('B'))],
      }),
    ).toThrowError(RetikzRuntimeError);
    expect(session.revision()).toBe(0);
    expect(handle.read(session)).toBe(before);
  });

  it('结构等价但可变的第三方 snapshot 不会泄漏到 committed public read', () => {
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'mutable-read' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const session = createRuntimeSession({
      owners,
      programs,
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });
    const read = handle.read(session);
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
      createRetainedRenderParticipant({
        backend: 'svg',
        host: svgHost,
        rendererFactory: (() => mismatching) as unknown as RetainedRendererFactory,
        immutableOptions: { backend: 'svg', idPrefix: 'mismatch' },
        coreProgram: createCoreProgram({ onWarn: () => undefined }),
      });
      throw new Error('expected renderer mismatch');
    } catch (error) {
      expect(error).toEqual(
        expect.objectContaining({
          code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid,
          cause: expect.objectContaining({ renderer: mismatching, disposeFailure }),
        }),
      );
    }
  });

  it('公开 Runtime Session 仅重试失败 renderer cleanup，成功后进入幂等 disposed 状态', () => {
    const disposeFailure = new Error('dispose rejected');
    let remainingFailures = 2;
    const dispose = vi.fn(() => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        throw disposeFailure;
      }
    });
    let current: RenderFrameSnapshot | undefined;
    const prepare = (frame: RenderFrameSnapshot): RuntimePreparedCommit => {
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
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'dispose-retry' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({
      builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition],
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const session = createRuntimeSession({
      owners,
      programs,
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, scene('dispose')),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });

    expect(() => session.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDisposeFailed, cause: disposeFailure }),
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDisposeFailed, cause: disposeFailure }),
    ]);
    expect(() => handle.read(session)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.SessionDisposed }),
    );

    expect(() => session.dispose()).not.toThrow();
    expect(() => session.dispose()).not.toThrow();
    expect(dispose).toHaveBeenCalledTimes(3);
  });

  it('在 factory 前拒绝 backend/host mismatch，并以 Render error 暴露 cause', () => {
    const factory = vi.fn();
    expect(() =>
      createRetainedRenderParticipant({
        backend: 'svg',
        host: Object.freeze({ tagName: 'canvas' }) as unknown as SVGSVGElement,
        rendererFactory: factory as RetainedRendererFactory,
        immutableOptions: { backend: 'svg', idPrefix: 'invalid' },
        coreProgram: createCoreProgram({ onWarn: () => undefined }),
      }),
    ).toThrowError(
      expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRenderParticipantInputInvalid }),
    );
    expect(factory).not.toHaveBeenCalled();
  });

  it('把 participant options getter throw 收敛为稳定 input error', () => {
    const getterFailure = new Error('options getter failed');
    const options = new Proxy({} as Parameters<typeof createRetainedRenderParticipant>[0], {
      get: () => {
        throw getterFailure;
      },
    });

    expect(() => createRetainedRenderParticipant(options)).toThrowError(
      expect.objectContaining({
        code: RetikzRetainedRenderErrorCode.RetainedRenderParticipantInputInvalid,
        cause: getterFailure,
      }),
    );
  });

  it('一次捕获 participant options，校验后不重新读取动态输入', () => {
    const renderer = createRendererHarness();
    const target = {
      backend: 'svg' as const,
      host: svgHost,
      rendererFactory: (() => renderer.renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg' as const, idPrefix: 'capture-once' },
      coreProgram: createCoreProgram({ onWarn: () => undefined }),
    };
    const reads = new Map<PropertyKey, number>();
    const options = new Proxy(target, {
      get: (value, key, receiver) => {
        const count = (reads.get(key) ?? 0) + 1;
        reads.set(key, count);
        if (count > 1) throw new Error(`property ${String(key)} was read twice`);
        return Reflect.get(value, key, receiver);
      },
    });

    expect(() => createRetainedRenderParticipant(options)).not.toThrow();
    expect([...reads.values()].every(count => count === 1)).toBe(true);
  });

  it('把 renderer 未知 prepare throw 包装为稳定 RetikzRetainedRenderError cause', () => {
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'throw' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });

    try {
      createRuntimeSession({
        owners,
        programs,
        participants: [handle.participant],
        initialSnapshots: [
          createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
        ],
      });
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRuntimeError);
      const runtime = error as RetikzRuntimeError;
      expect(runtime.code).toBe(RetikzRuntimeErrorCode.ParticipantPrepareFailed);
      expect(isRetikzRetainedRenderError(runtime.cause)).toBe(true);
      expect((runtime.cause as RetikzRetainedRenderError).code).toBe(
        RetikzRetainedRenderErrorCode.RetainedRendererPrepareFailed,
      );
    }
  });

  it('保留 renderer prepare 已抛出的 RetikzRetainedRenderError identity 与 code', () => {
    const expected = new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.ScenePatchInvalid,
      cause: Object.freeze({ fixture: true }),
    });
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'retained-error' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });

    try {
      createRuntimeSession({
        owners,
        programs,
        participants: [handle.participant],
        initialSnapshots: [
          createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
        ],
      });
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRuntimeError);
      expect((error as RetikzRuntimeError).code).toBe(RetikzRuntimeErrorCode.ParticipantPrepareFailed);
      expect((error as RetikzRuntimeError).cause).toBe(expected);
      expect(((error as RetikzRuntimeError).cause as RetikzRetainedRenderError).code).toBe(
        RetikzRetainedRenderErrorCode.ScenePatchInvalid,
      );
    }
  });

  it('把 renderer read getter throw 包装为稳定 snapshot mismatch cause', () => {
    const getterFailure = new Error('read getter failed');
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'read-getter' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });

    try {
      createRuntimeSession({
        owners,
        programs,
        participants: [handle.participant],
        initialSnapshots: [
          createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
        ],
      });
      throw new Error('expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzRuntimeError);
      const runtime = error as RetikzRuntimeError;
      expect(runtime.code).toBe(RetikzRuntimeErrorCode.ParticipantReadFailed);
      expect(runtime.cause).toEqual(
        expect.objectContaining({
          code: RetikzRetainedRenderErrorCode.ScenePatchSnapshotMismatch,
          cause: getterFailure,
        }),
      );
    }
  });

  it('在 publish 前拒绝 malformed AnimationControls', () => {
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'malformed-animation' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        participants: [handle.participant],
        initialSnapshots: [
          createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
          createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ParticipantReadFailed,
        cause: expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid }),
      }),
    );
  });

  it('固定捕获 AnimationControls callback 与 data state，不保留可变容器 alias', () => {
    const coreProgram = createCoreProgram({ onWarn: () => undefined });
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
    const handle = createRetainedRenderParticipant({
      backend: 'svg',
      host: svgHost,
      rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
      immutableOptions: { backend: 'svg', idPrefix: 'animation-capture' },
      coreProgram,
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const session = createRuntimeSession({
      owners,
      programs,
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, scene('A')),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });
    const animation = handle.read(session).animation;
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
