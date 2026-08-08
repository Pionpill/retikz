import type { IRScene, Scene, ScenePatch, SceneRuntimeSnapshot } from '@retikz/core';
import type {
  RenderFrameSnapshot,
  RenderRuntimeConfigInput,
  RetainedCanvasRenderer,
  RetainedRenderer,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
  RetainedSvgRenderer,
} from '@retikz/render/runtime';
import type { PerformanceTraceOutcomeValue, PerformanceTraceRecord } from '@retikz/runtime';

import { compileToScene, CORE_OWNER_KEY, CoreOwnerDefinition } from '@retikz/core';
import { drawScene, renderToCanvas } from '@retikz/render/canvas';
import { builtinRetainedRendererFactory, defineRetainedRenderer } from '@retikz/render/runtime';
import { buildSvgDocument, renderToSvgString } from '@retikz/render/svg';
import {
  createRuntimeOwnerUpdate,
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '@retikz/runtime';
import { mountCanvas, mountSvg } from '@retikz/vanilla';

import type {
  BenchmarkExecution,
  DeterministicBenchmarkResult,
  RetainedBenchmarkSession,
  WallClockScenarioReport,
} from '../shared';
import type { BrowserBenchmarkOptions, BrowserBenchmarkResult, RetikzBenchWindow } from './browser-contract';

import {
  assertFullTrace,
  assertSingleTraceRecord,
  createBackendHost,
  createBenchmarkCanvas,
  createRetainedBenchmarkSession,
  createSimpleNodeScene,
  createStableGroupScene,
  fullBaselineSizes,
  measureScenario,
  stableHash,
  toResult,
  updateSimpleNodeFill,
  updateStableGroupFill,
} from '../shared';

/** 对真实 Canvas 像素生成 FNV-1a 32-bit 功能摘要 */
export const hashCanvasPixels = (context: CanvasRenderingContext2D): string => {
  const { width, height } = context.canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let hash = 0x811c9dc5;
  const mix = (value: number): void => {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193);
  };
  for (const value of [width, height]) {
    mix(value & 0xff);
    mix((value >>> 8) & 0xff);
    mix((value >>> 16) & 0xff);
    mix((value >>> 24) & 0xff);
  }
  for (const value of pixels) mix(value);
  return (hash >>> 0).toString(16).padStart(8, '0');
};

type HostListenerProbe = Readonly<{
  live: () => number;
  restore: () => void;
}>;

type ImageLifecycleProbe = Readonly<{
  images: Array<HTMLImageElement>;
  restore: () => void;
}>;

/** 包装真实host listener注册，在dispose后观测仍未解绑的listener */
const createHostListenerProbe = (host: SVGSVGElement | HTMLCanvasElement): HostListenerProbe => {
  const active = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const originalAdd = host.addEventListener.bind(host);
  const originalRemove = host.removeEventListener.bind(host);
  const keyOf = (type: string, options?: boolean | AddEventListenerOptions): string =>
    `${type}:${String(typeof options === 'boolean' ? options : options?.capture === true)}`;
  host.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    const listeners = active.get(keyOf(type, options)) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    active.set(keyOf(type, options), listeners);
    originalAdd(type, listener, options);
  }) as typeof host.addEventListener;
  host.removeEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void => {
    const key = keyOf(type, options);
    const listeners = active.get(key);
    listeners?.delete(listener);
    if (listeners?.size === 0) active.delete(key);
    originalRemove(type, listener, options);
  }) as typeof host.removeEventListener;
  return Object.freeze({
    live: () => [...active.values()].reduce((count, listeners) => count + listeners.size, 0),
    restore: () => {
      host.addEventListener = originalAdd;
      host.removeEventListener = originalRemove;
    },
  });
};

/** 包装真实Image构造器，在dispose后观测仍未释放的资源回调 */
const createImageLifecycleProbe = (): ImageLifecycleProbe => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const OriginalImage = globalThis.Image;
  const images: Array<HTMLImageElement> = [];
  const TrackingImage = function (): HTMLImageElement {
    const image = new OriginalImage();
    images.push(image);
    return image;
  } as unknown as typeof Image;
  TrackingImage.prototype = OriginalImage.prototype;
  Object.setPrototypeOf(TrackingImage, OriginalImage);
  const restore = (): void => {
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, 'Image');
    else Object.defineProperty(globalThis, 'Image', descriptor);
  };
  const probe = Object.freeze({ images, restore });
  Object.defineProperty(globalThis, 'Image', { configurable: true, writable: true, value: TrackingImage });
  return probe;
};

/** 把Scene user point映射为Canvas client point，供真实hit-test事件探针使用 */
const toCanvasClientPoint = (
  host: HTMLCanvasElement,
  snapshot: SceneRuntimeSnapshot,
  point: Readonly<{ x: number; y: number }>,
): Readonly<{ x: number; y: number }> => {
  const bounds = host.getBoundingClientRect();
  const layout = snapshot.scene.layout;
  const scale = Math.min(bounds.width / layout.width, bounds.height / layout.height);
  return Object.freeze({
    x: bounds.left + (bounds.width - layout.width * scale) / 2 + (point.x - layout.x) * scale,
    y: bounds.top + (bounds.height - layout.height * scale) / 2 + (point.y - layout.y) * scale,
  });
};

/** 用真实listener、Canvas hit-test与image handler验证session.dispose释放renderer-lifetime handle */
const assertRetainedDisposeLifecycle = (backend: 'svg' | 'canvas', baseSource: IRScene): number => {
  const host = createBackendHost(backend);
  if (backend === 'canvas') {
    (host as HTMLCanvasElement).getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1_440,
      height: 900,
      right: 1_440,
      bottom: 900,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  }
  const listenerProbe = createHostListenerProbe(host);
  let imageProbe: ImageLifecycleProbe | undefined;
  let value: RetainedBenchmarkSession | undefined;
  try {
    let source = baseSource;
    if (backend === 'canvas') {
      const first = baseSource.children[0];
      if (first.type !== 'node') throw new Error('retained lifecycle fixture requires a first Node');
      source = {
        ...baseSource,
        children: [
          {
            ...first,
            fill: {
              kind: 'image',
              href: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E',
            },
          },
          ...baseSource.children.slice(1),
        ],
      };
      imageProbe = createImageLifecycleProbe();
    }
    const images = imageProbe?.images ?? [];
    let handlerCalls = 0;
    const config: RenderRuntimeConfigInput = {
      handlerContributions: [
        {
          registration: 1,
          handlers: { 'entity-00000': { click: () => (handlerCalls += 1) } },
        },
      ],
    };
    value = createRetainedBenchmarkSession(backend, host, source, [], builtinRetainedRendererFactory, config);
    if (listenerProbe.live() === 0) throw new Error(`${backend} retained lifecycle probe did not install a listener`);
    if (backend === 'svg') {
      const target = host.querySelector('[data-retikz-id="entity-00000"]');
      if (target === null) throw new Error('SVG retained lifecycle target is unavailable');
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } else {
      const snapshot = value.session.artifact(value.coreProgram).value.snapshot;
      const client = toCanvasClientPoint(host as HTMLCanvasElement, snapshot, { x: 0, y: 0 });
      host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: client.x, clientY: client.y }));
      if (images.length === 0) throw new Error('Canvas retained lifecycle probe did not create an image resource');
    }
    if (handlerCalls !== 1) throw new Error(`${backend} retained lifecycle hit-test/handler probe did not fire once`);
    value.session.dispose();
    value = undefined;
    const callsBeforeDisposedEvent = handlerCalls;
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 }));
    const liveImageHandlers = images.filter(image => image.onload !== null || image.onerror !== null).length;
    const liveHandles = listenerProbe.live() + liveImageHandlers + (handlerCalls - callsBeforeDisposedEvent);
    if (liveHandles !== 0) throw new Error(`${backend} retained lifecycle leaked ${liveHandles} observable handles`);
    return liveHandles;
  } finally {
    value?.session.dispose();
    listenerProbe.restore();
    imageProbe?.restore();
  }
};

/** 读取一次 renderer scene-change trace，并拒绝重复或错误 outcome */
const readRetainedUpdateRecord = (
  id: string,
  backend: 'svg' | 'canvas',
  records: ReadonlyArray<PerformanceTraceRecord>,
  outcome: PerformanceTraceOutcomeValue,
): PerformanceTraceRecord => {
  return assertSingleTraceRecord(id, records, {
    owner: `@retikz/render:${backend}`,
    phase: PerformanceTracePhase.Update,
    unit: PerformanceTraceUnit.SceneChange,
    outcome,
    visited: 1,
    reused: 0,
    changed: 1,
  });
};

/** 通过公共 view mode 证明 static 场景没有伪造 Runtime outcome */
const assertStaticViewMode = (id: string, view: Readonly<{ mode: string }>): void => {
  if (view.mode !== 'static') throw new Error(`${id}: expected public static view`);
};

/** 把 static SVG oracle 交给 browser parser 规范化后与 retained host 逐字对比 */
const assertSvgFullOracle = (id: string, host: SVGSVGElement, scene: Scene): string => {
  const expectedRoot = new DOMParser()
    .parseFromString(renderToSvgString(scene, { idPrefix: 'retained-bench', animate: false }), 'text/html')
    .querySelector('svg');
  if (expectedRoot === null) throw new Error(`${id}: full SVG oracle root is unavailable`);
  const expected = expectedRoot.outerHTML;
  const actual = host.outerHTML;
  if (actual !== expected) {
    const difference = [...actual].findIndex((character, index) => character !== expected[index]);
    const start = Math.max(0, difference - 80);
    const end = difference + 160;
    throw new Error(
      `${id}: retained SVG differs from full oracle at ${difference.toString()}; actual=${actual.slice(start, end)}; expected=${expected.slice(start, end)}`,
    );
  }
  return stableHash(actual);
};

/** 以独立 static Canvas full render 校验 retained bitmap */
const assertCanvasFullOracle = (id: string, host: HTMLCanvasElement, scene: Scene): string => {
  const oracle = document.createElement('canvas');
  oracle.width = host.width;
  oracle.height = host.height;
  renderToCanvas(oracle, scene, { devicePixelRatio: 1 });
  const actualContext = host.getContext('2d', { willReadFrequently: true });
  const oracleContext = oracle.getContext('2d', { willReadFrequently: true });
  if (actualContext === null || oracleContext === null) throw new Error(`${id}: Canvas context is unavailable`);
  const actual = hashCanvasPixels(actualContext);
  const expected = hashCanvasPixels(oracleContext);
  if (actual !== expected) throw new Error(`${id}: retained Canvas differs from full oracle`);
  return actual;
};

const replaceSvgHost = (host: SVGSVGElement, source: SVGSVGElement): void => {
  for (const attribute of [...host.attributes]) host.removeAttribute(attribute.name);
  for (const attribute of [...source.attributes]) host.setAttribute(attribute.name, attribute.value);
  host.replaceChildren(...[...source.childNodes].map(child => child.cloneNode(true)));
};

/** 创建只声明 none capability、每次都以完整 public renderer materialize 的测试 factory */
const createNoneCapabilityFactory = (observePatch: (patch: ScenePatch) => void): RetainedRendererFactory => {
  const createSvgRenderer = (
    input: Extract<RetainedRendererFactoryInput, Readonly<{ backend: 'svg' }>>,
  ): RetainedSvgRenderer => {
    let current: RenderFrameSnapshot | undefined;
    const prepare = (patch: ScenePatch | undefined, frame: RenderFrameSnapshot) => {
      if (patch !== undefined) observePatch(patch);
      const markup = renderToSvgString(frame.primary.scene as unknown as Scene, {
        idPrefix: input.immutableOptions.idPrefix,
        animate: false,
      });
      const candidate = new DOMParser().parseFromString(markup, 'image/svg+xml')
        .documentElement as unknown as SVGSVGElement;
      const previousHost = input.host.cloneNode(true) as SVGSVGElement;
      const previous = current;
      return Object.freeze({
        commit: () => {
          replaceSvgHost(input.host, candidate);
          current = frame;
        },
        rollback: () => {
          replaceSvgHost(input.host, previousHost);
          current = previous;
        },
        dispose: () => undefined,
      });
    };
    return defineRetainedRenderer({
      backend: 'svg',
      host: input.host,
      capability: 'none',
      readonlyLayerCapability: 'unsupported',
      prepareMount: frame => prepare(undefined, frame),
      prepare: (patch, frame) => prepare(patch, frame),
      read: () => {
        if (current === undefined) throw new Error('none SVG benchmark renderer is not committed');
        return Object.freeze({ frame: current });
      },
      dispose: () => {
        current = undefined;
      },
    });
  };
  const createCanvasRenderer = (
    input: Extract<RetainedRendererFactoryInput, Readonly<{ backend: 'canvas' }>>,
  ): RetainedCanvasRenderer => {
    let current: RenderFrameSnapshot | undefined;
    const prepare = (patch: ScenePatch | undefined, frame: RenderFrameSnapshot) => {
      if (patch !== undefined) observePatch(patch);
      const candidate = document.createElement('canvas');
      candidate.width = input.host.width;
      candidate.height = input.host.height;
      renderToCanvas(candidate, frame.primary.scene as unknown as Scene, { devicePixelRatio: 1 });
      const previous = document.createElement('canvas');
      previous.width = input.host.width;
      previous.height = input.host.height;
      previous.getContext('2d')?.drawImage(input.host, 0, 0);
      const previousSnapshot = current;
      const replace = (source: HTMLCanvasElement): void => {
        const context = input.host.getContext('2d');
        if (context === null) throw new Error('none Canvas benchmark renderer context is unavailable');
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, input.host.width, input.host.height);
        context.drawImage(source, 0, 0);
      };
      return Object.freeze({
        commit: () => {
          replace(candidate);
          current = frame;
        },
        rollback: () => {
          replace(previous);
          current = previousSnapshot;
        },
        dispose: () => undefined,
      });
    };
    return defineRetainedRenderer({
      backend: 'canvas',
      host: input.host,
      capability: 'none',
      readonlyLayerCapability: 'unsupported',
      prepareMount: frame => prepare(undefined, frame),
      prepare: (patch, frame) => prepare(patch, frame),
      read: () => {
        if (current === undefined) throw new Error('none Canvas benchmark renderer is not committed');
        return Object.freeze({ frame: current });
      },
      dispose: () => {
        current = undefined;
      },
    });
  };
  return ((input: RetainedRendererFactoryInput): RetainedRenderer =>
    input.backend === 'svg' ? createSvgRenderer(input) : createCanvasRenderer(input)) as RetainedRendererFactory;
};

/** 运行 SVG 与 Canvas 的确定性 full-path benchmark */
const runDeterministicBrowserBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  for (const size of fullBaselineSizes) {
    const scene = compileToScene(createSimpleNodeScene(size)).scene;

    const svgRecords: Array<PerformanceTraceRecord> = [];
    const svgReporter = createRuntimeTraceReporter({
      owner: '@retikz/render:svg',
      phases: [
        {
          phase: PerformanceTracePhase.Commit,
          unit: PerformanceTraceUnit.ScenePrimitive,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: record => svgRecords.push(record),
    });
    const svg = buildSvgDocument(scene, {
      idPrefix: `bench-${size}`,
      animate: false,
      trace: svgReporter,
    });
    const svgRecord = assertFullTrace(`svg-full-${size}`, svgReporter, svgRecords, {
      phase: PerformanceTracePhase.Commit,
      unit: PerformanceTraceUnit.ScenePrimitive,
      visited: size,
    });
    results.push(toResult(`svg-full-${size}`, stableHash(svg), svgRecord));

    const { context } = createBenchmarkCanvas();
    const canvasRecords: Array<PerformanceTraceRecord> = [];
    const canvasReporter = createRuntimeTraceReporter({
      owner: '@retikz/render:canvas',
      phases: [
        {
          phase: PerformanceTracePhase.Commit,
          unit: PerformanceTraceUnit.ScenePrimitive,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: record => canvasRecords.push(record),
    });
    drawScene(context, scene, { trace: canvasReporter });
    const canvasRecord = assertFullTrace(`canvas-full-${size}`, canvasReporter, canvasRecords, {
      phase: PerformanceTracePhase.Commit,
      unit: PerformanceTraceUnit.ScenePrimitive,
      visited: size,
    });
    results.push(toResult(`canvas-full-${size}`, hashCanvasPixels(context), canvasRecord));
  }
  return Object.freeze(results);
};

const readRetainedFullRecord = (
  id: string,
  backend: 'svg' | 'canvas',
  records: ReadonlyArray<PerformanceTraceRecord>,
): PerformanceTraceRecord => {
  return assertSingleTraceRecord(id, records, {
    owner: `@retikz/render:${backend}`,
    phase: PerformanceTracePhase.Commit,
    unit: PerformanceTraceUnit.ScenePrimitive,
    outcome: PerformanceTraceOutcome.Full,
    visited: 5_000,
    reused: 0,
    changed: 5_000,
  });
};

const assertBackendOracle = (
  id: string,
  backend: 'svg' | 'canvas',
  host: SVGSVGElement | HTMLCanvasElement,
  scene: Scene,
): string =>
  backend === 'svg'
    ? assertSvgFullOracle(id, host as SVGSVGElement, scene)
    : assertCanvasFullOracle(id, host as HTMLCanvasElement, scene);

/** 运行 retained initial、entity、Group 与 replace fallback 的确定性 browser benchmark */
const runRetainedDeterministicBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  const runWithSession = (
    backend: 'svg' | 'canvas',
    source: IRScene,
    execute: (
      host: SVGSVGElement | HTMLCanvasElement,
      records: Array<PerformanceTraceRecord>,
      value: RetainedBenchmarkSession,
    ) => void,
    rendererFactory?: RetainedRendererFactory,
  ): void => {
    const host = createBackendHost(backend);
    const records: Array<PerformanceTraceRecord> = [];
    const value = createRetainedBenchmarkSession(backend, host, source, records, rendererFactory);
    try {
      execute(host, records, value);
    } finally {
      value.session.dispose();
    }
  };

  for (const backend of ['svg', 'canvas'] as const) {
    const current = createSimpleNodeScene(5_000);
    const next = updateSimpleNodeFill(current, 2_500, '#22c55e');
    const liveHandles = assertRetainedDisposeLifecycle(backend, current);
    runWithSession(backend, current, (host, records, value) => {
      const fullId = `${backend}-retained-full-5000`;
      const fullRecord = readRetainedFullRecord(fullId, backend, records);
      const initialScene = value.session.artifact(value.coreProgram).value.snapshot.scene as unknown as Scene;
      results.push(toResult(fullId, assertBackendOracle(fullId, backend, host, initialScene), fullRecord, liveHandles));

      const unchangedSvgNode = backend === 'svg' ? host.querySelector('[data-retikz-id="entity-00000"]') : undefined;
      records.length = 0;
      value.session.update({
        baseRevision: value.session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
      });
      const artifact = value.session.artifact(value.coreProgram).value;
      const id = `${backend}-single-entity-update-5000`;
      if (
        artifact.patch?.operations.length !== 1 ||
        artifact.patch.operations[0]?.kind !== 'update' ||
        artifact.patch.operations[0].subtree.primitive.type === 'group'
      ) {
        throw new Error(`${id}: Core did not produce one entity update`);
      }
      if (
        backend === 'svg' &&
        (unchangedSvgNode === null || host.querySelector('[data-retikz-id="entity-00000"]') !== unchangedSvgNode)
      ) {
        throw new Error(`${id}: unchanged SVG node identity was replaced`);
      }
      const record = readRetainedUpdateRecord(id, backend, records, 'incremental');
      const oracleScene = compileToScene(next).scene;
      results.push(toResult(id, assertBackendOracle(id, backend, host, oracleScene), record));
    });

    const groupCurrent = createStableGroupScene(5_000);
    const groupNext = updateStableGroupFill(groupCurrent, '#22c55e');
    runWithSession(backend, groupCurrent, (host, records, value) => {
      records.length = 0;
      value.session.update({
        baseRevision: value.session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, groupNext)],
      });
      const artifact = value.session.artifact(value.coreProgram).value;
      const id = `${backend}-group-update-5000`;
      if (
        artifact.patch?.operations.length !== 1 ||
        artifact.patch.operations[0]?.kind !== 'update' ||
        artifact.patch.operations[0].subtree.primitive.type !== 'group'
      ) {
        throw new Error(`${id}: Core did not produce one stable Group subtree update`);
      }
      const record = readRetainedUpdateRecord(id, backend, records, 'incremental');
      results.push(toResult(id, assertBackendOracle(id, backend, host, compileToScene(groupNext).scene), record));
    });

    const observedPatches: Array<ScenePatch> = [];
    const fallbackFactory = createNoneCapabilityFactory(patch => observedPatches.push(patch));
    runWithSession(
      backend,
      current,
      (host, records, value) => {
        records.length = 0;
        value.session.update({
          baseRevision: value.session.revision(),
          owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
        });
        const id = `${backend}-replace-fallback-5000`;
        if (
          observedPatches.length !== 1 ||
          observedPatches[0]?.operations.length !== 1 ||
          observedPatches[0].operations[0]?.kind !== 'replaceScene'
        ) {
          throw new Error(`${id}: none capability did not receive one replaceScene operation`);
        }
        const fallbackWarnings = value.session
          .diagnostics()
          .filter(diagnostic => diagnostic.code === 'RETAINED_RENDERER_CAPABILITY_FALLBACK');
        if (fallbackWarnings.length !== 1) throw new Error(`${id}: expected one capability fallback diagnostic`);
        const record = readRetainedUpdateRecord(id, backend, records, 'fallback');
        results.push(toResult(id, assertBackendOracle(id, backend, host, compileToScene(next).scene), record));
      },
      fallbackFactory,
    );
  }
  return Object.freeze(results);
};

/** 运行 static-full / retained-full / retained-auto 三组共享 fixture 策略基准 */
const runPolicyDeterministicBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  const current = createSimpleNodeScene(5_000);
  const next = updateSimpleNodeFill(current, 2_500, '#22c55e');
  const oracleScene = compileToScene(next).scene;

  for (const backend of ['svg', 'canvas'] as const) {
    const staticId = `${backend}-policy-static-full-5000`;
    const staticRecords: Array<PerformanceTraceRecord> = [];
    const staticReporter = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [
        {
          phase: PerformanceTracePhase.Compile,
          unit: PerformanceTraceUnit.IrChild,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: record => staticRecords.push(record),
    });
    const container = document.createElement('div');
    const staticView =
      backend === 'svg'
        ? mountSvg(container, current, {
            runtime: { mode: 'static' },
            compile: { trace: staticReporter },
            output: { idPrefix: 'retained-bench' },
            animation: { enabled: false },
          })
        : mountCanvas(container, current, {
            runtime: { mode: 'static' },
            compile: { trace: staticReporter },
            animation: { enabled: false },
            canvas: { devicePixelRatio: 1 },
          });
    try {
      staticRecords.length = 0;
      staticView.update(next);
      assertStaticViewMode(staticId, staticView);
      const record = assertFullTrace(staticId, staticReporter, staticRecords, {
        phase: PerformanceTracePhase.Compile,
        unit: PerformanceTraceUnit.IrChild,
        visited: 5_000,
      });
      const execution: BenchmarkExecution = Object.freeze({
        mode: 'static',
        outcome: PerformanceTraceOutcome.Full,
        source: 'static-view',
      });
      results.push(
        toResult(
          staticId,
          assertBackendOracle(staticId, backend, staticView.root, oracleScene),
          record,
          undefined,
          execution,
        ),
      );
    } finally {
      staticView.dispose();
    }

    for (const updateStrategy of ['full', 'auto'] as const) {
      const id = `${backend}-policy-retained-${updateStrategy}-5000`;
      const host = createBackendHost(backend);
      const records: Array<PerformanceTraceRecord> = [];
      const value = createRetainedBenchmarkSession(
        backend,
        host,
        current,
        records,
        builtinRetainedRendererFactory,
        {},
        updateStrategy,
      );
      try {
        records.length = 0;
        value.session.update({
          baseRevision: value.session.revision(),
          owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
        });
        const outcome = updateStrategy === 'full' ? PerformanceTraceOutcome.Full : PerformanceTraceOutcome.Incremental;
        const work = assertSingleTraceRecord(id, records, {
          owner: CORE_OWNER_KEY,
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.IrChild,
          outcome,
          visited: 5_000,
          reused: updateStrategy === 'full' ? 0 : 4_999,
          changed: updateStrategy === 'full' ? 5_000 : 1,
        });
        readRetainedUpdateRecord(id, backend, records, outcome);
        if (value.session.diagnostics().length !== 0) throw new Error(`${id}: unexpected Runtime diagnostics`);
        const execution: BenchmarkExecution = Object.freeze({
          mode: 'retained',
          updateStrategy,
          outcome,
          source: 'runtime-trace',
        });
        results.push(toResult(id, assertBackendOracle(id, backend, host, oracleScene), work, undefined, execution));
      } finally {
        value.session.dispose();
      }
    }
  }
  return Object.freeze(results);
};

const measureRetainedUpdateScenario = (
  id: string,
  backend: 'svg' | 'canvas',
  first: IRScene,
  second: IRScene,
  warmupRuns: number,
  sampleRuns: number,
  rendererFactory?: RetainedRendererFactory,
  updateStrategy?: 'auto' | 'full',
): WallClockScenarioReport => {
  const host = createBackendHost(backend);
  const records: Array<PerformanceTraceRecord> = [];
  const value = createRetainedBenchmarkSession(backend, host, first, records, rendererFactory, {}, updateStrategy);
  let next = second;
  try {
    return measureScenario(id, warmupRuns, sampleRuns, () => {
      value.session.update({
        baseRevision: value.session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
      });
      next = next === first ? second : first;
    });
  } finally {
    value.session.dispose();
  }
};

/** 测量 public static view 的完整编译与重绘更新 */
const measureStaticPolicyUpdateScenario = (
  id: string,
  backend: 'svg' | 'canvas',
  first: IRScene,
  second: IRScene,
  warmupRuns: number,
  sampleRuns: number,
): WallClockScenarioReport => {
  const container = document.createElement('div');
  const view =
    backend === 'svg'
      ? mountSvg(container, first, {
          runtime: { mode: 'static' },
          output: { idPrefix: 'retained-bench' },
          animation: { enabled: false },
        })
      : mountCanvas(container, first, {
          runtime: { mode: 'static' },
          animation: { enabled: false },
          canvas: { devicePixelRatio: 1 },
        });
  let next = second;
  try {
    return measureScenario(id, warmupRuns, sampleRuns, () => {
      view.update(next);
      next = next === first ? second : first;
    });
  } finally {
    view.dispose();
  }
};

/** 测量指定 renderer factory 的 retained initial create 与 dispose */
const measureRetainedFullScenario = (
  id: string,
  backend: 'svg' | 'canvas',
  source: IRScene,
  warmupRuns: number,
  sampleRuns: number,
  rendererFactory?: RetainedRendererFactory,
): WallClockScenarioReport =>
  measureScenario(id, warmupRuns, sampleRuns, () => {
    const value = createRetainedBenchmarkSession(backend, createBackendHost(backend), source, [], rendererFactory);
    value.session.dispose();
  });

/** 在真实 browser host 中生成 retained renderer wall-clock 场景 */
const runRetainedWallClockReport = (warmupRuns: number, sampleRuns: number): ReadonlyArray<WallClockScenarioReport> => {
  const reports: Array<WallClockScenarioReport> = [];
  const entityFirst = createSimpleNodeScene(5_000);
  const entitySecond = updateSimpleNodeFill(entityFirst, 2_500, '#22c55e');
  const groupFirst = createStableGroupScene(5_000);
  const groupSecond = updateStableGroupFill(groupFirst, '#22c55e');
  for (const backend of ['svg', 'canvas'] as const) {
    const noneFactory = createNoneCapabilityFactory(() => undefined);
    reports.push(
      measureStaticPolicyUpdateScenario(
        `${backend}-policy-static-full-5000`,
        backend,
        entityFirst,
        entitySecond,
        warmupRuns,
        sampleRuns,
      ),
      measureRetainedUpdateScenario(
        `${backend}-policy-retained-full-5000`,
        backend,
        entityFirst,
        entitySecond,
        warmupRuns,
        sampleRuns,
        undefined,
        'full',
      ),
      measureRetainedUpdateScenario(
        `${backend}-policy-retained-auto-5000`,
        backend,
        entityFirst,
        entitySecond,
        warmupRuns,
        sampleRuns,
        undefined,
        'auto',
      ),
      measureRetainedFullScenario(`${backend}-retained-full-5000`, backend, entityFirst, warmupRuns, sampleRuns),
      measureRetainedUpdateScenario(
        `${backend}-single-entity-update-5000`,
        backend,
        entityFirst,
        entitySecond,
        warmupRuns,
        sampleRuns,
      ),
      measureRetainedFullScenario(
        `${backend}-none-retained-full-5000`,
        backend,
        entityFirst,
        warmupRuns,
        sampleRuns,
        noneFactory,
      ),
      measureRetainedUpdateScenario(
        `${backend}-group-update-5000`,
        backend,
        groupFirst,
        groupSecond,
        warmupRuns,
        sampleRuns,
      ),
      measureRetainedUpdateScenario(
        `${backend}-replace-fallback-5000`,
        backend,
        entityFirst,
        entitySecond,
        warmupRuns,
        sampleRuns,
        noneFactory,
      ),
    );
  }
  return Object.freeze(reports);
};

/** 在真实 browser backend 中生成 renderer wall-clock 报告 */
const runBrowserWallClockReport = (warmupRuns: number, sampleRuns: number): ReadonlyArray<WallClockScenarioReport> => {
  const reports: Array<WallClockScenarioReport> = [];
  for (const size of fullBaselineSizes) {
    const scene = compileToScene(createSimpleNodeScene(size)).scene;
    const { context } = createBenchmarkCanvas();
    reports.push(
      measureScenario(`svg-full-${size}`, warmupRuns, sampleRuns, () => {
        buildSvgDocument(scene, { idPrefix: `report-${size}`, animate: false });
      }),
      measureScenario(`canvas-full-${size}`, warmupRuns, sampleRuns, () => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        drawScene(context, scene);
      }),
    );
  }
  return Object.freeze([...reports, ...runRetainedWallClockReport(warmupRuns, sampleRuns)]);
};

/** 采集影响 renderer 输出和时间可比性的 browser 环境字段 */
const readEnvironment = (browserVersion: string): BrowserBenchmarkResult['environment'] => {
  const fontProbe = document.createElement('canvas').getContext('2d');
  if (fontProbe === null) throw new Error('browser benchmark: font probe context is unavailable');
  fontProbe.font = '16px Arial';
  return Object.freeze({
    browserVersion,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: Object.freeze({ width: window.innerWidth, height: window.innerHeight }),
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    fontAvailable: document.fonts.check('16px Arial'),
    fontMetric: fontProbe.measureText('retikz benchmark 0123456789').width,
  });
};

/** Playwright runner 调用的 browser benchmark 唯一入口 */
const runBrowserBenchmarks = async (options: BrowserBenchmarkOptions): Promise<BrowserBenchmarkResult> => {
  await document.fonts.ready;
  return Object.freeze({
    environment: readEnvironment(options.browserVersion),
    deterministic: Object.freeze([
      ...runDeterministicBrowserBenchmarks(),
      ...runRetainedDeterministicBenchmarks(),
      ...runPolicyDeterministicBenchmarks(),
    ]),
    wallClock: options.includeWallClock
      ? runBrowserWallClockReport(options.warmupRuns, options.sampleRuns)
      : Object.freeze([]),
  });
};

if (typeof window !== 'undefined') {
  Object.assign(window as RetikzBenchWindow, { retikzBench: Object.freeze({ run: runBrowserBenchmarks }) });
}
