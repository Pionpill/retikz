// @vitest-environment jsdom
import type { Canvas as NapiCanvas } from '@napi-rs/canvas';
import type { IRScene, RuntimeScenePrimitive, Scene, ScenePatch, SceneRuntimeSnapshot } from '@retikz/core';
import type { RuntimeCommitParticipantToken } from '@retikz/runtime';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeIdentity,
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  RetikzRuntimeErrorCode,
  RuntimeProgramPhase,
} from '@retikz/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HydrationAnimationControls, HydrationContext } from '../../src/hydration';
import type { RenderFrameSnapshot, RenderReadonlyLayer, RenderRuntimeConfigInput } from '../../src/runtime';

import { bindWaapiDescriptors } from '../../src/animation';
import { bindWaapiDescriptorElements, isWaapiAnimationStyleOwned } from '../../src/animation/retained';
import { renderToCanvas } from '../../src/canvas';
import { RetikzRenderError, RetikzRenderErrorCode } from '../../src/error';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderRuntimeOwnerDefinition,
} from '../../src/runtime';
import { getRetainedRendererExecutor } from '../../src/runtime/renderer';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const frameOf = (primary: SceneRuntimeSnapshot): RenderFrameSnapshot =>
  Object.freeze({ primary, layers: Object.freeze([]) });

const readonlyLayersAt = (x: number): ReadonlyArray<RenderReadonlyLayer> => [
  {
    key: 'guide',
    transform: [1, 0, 0, 1, 0, 0],
    scene: {
      layout: { x, y: 0, width: 20, height: 10 },
      primitives: [{ type: 'rect', x, y: 0, width: 20, height: 10, stroke: '#2563eb' }],
    },
  },
];

const imageReadonlyLayers = (href: string): ReadonlyArray<RenderReadonlyLayer> => [
  {
    key: 'image',
    transform: [1, 0, 0, 1, 0, 0],
    scene: {
      layout: { x: 0, y: 0, width: 20, height: 10 },
      resources: [
        {
          kind: 'paint',
          id: 'layer-image',
          spec: { kind: 'image', href },
        },
      ],
      primitives: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 20,
          height: 10,
          fill: { kind: 'resourceRef', id: 'layer-image' },
        },
      ],
    },
  },
];

const scene = (fill: string, reversed = false): IRScene => {
  const children: IRScene['children'] = [
    { type: 'node', id: 'node-a', position: [0, 0], text: 'A', fill },
    { type: 'node', id: 'node-b', position: [80, 0], text: 'B', fill: '#3b82f6' },
  ];
  return { version: 1, type: 'scene', children: reversed ? [...children].reverse() : children };
};

const animatedScene = (fill: string, trigger: 'manual' | 'visible' | Readonly<{ onEvent: string }>): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'node-a',
      position: [0, 0],
      text: 'A',
      fill,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 300,
          trigger,
        },
      ],
    },
  ],
});

/** 同时包含 visible 与 autoplay track 的 Canvas lifecycle 场景 */
const canvasLifecycleScene = (duration: number): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'visible',
      position: [0, 0],
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
          trigger: 'visible',
        },
      ],
    },
    {
      type: 'node',
      id: 'autoplay',
      position: [40, 0],
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
        },
      ],
    },
  ],
});

const createSession = (
  backend: 'svg' | 'canvas',
  host: SVGSVGElement | HTMLCanvasElement,
  options: Readonly<{
    config?: RenderRuntimeConfigInput;
    ir?: IRScene;
    mountMode?: 'create' | 'adopt';
    participants?: ReadonlyArray<RuntimeCommitParticipantToken>;
    useAmbientDevicePixelRatio?: boolean;
  }> = {},
) => {
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const handle =
    backend === 'svg'
      ? createRetainedRenderParticipant({
          backend,
          host: host as SVGSVGElement,
          rendererFactory: builtinRetainedRendererFactory,
          immutableOptions: { backend, idPrefix: 'builtin-test' },
          coreProgram,
          ...(options.mountMode === undefined ? {} : { mountMode: options.mountMode }),
        })
      : createRetainedRenderParticipant({
          backend,
          host: host as HTMLCanvasElement,
          rendererFactory: builtinRetainedRendererFactory,
          immutableOptions: {
            backend,
            idPrefix: 'builtin-test',
            ...(options.useAmbientDevicePixelRatio === true ? {} : { devicePixelRatio: 1 }),
          },
          coreProgram,
          ...(options.mountMode === undefined ? {} : { mountMode: options.mountMode }),
        });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const session = createRuntimeSession({
    owners,
    programs,
    participants: [handle.participant, ...(options.participants ?? [])],
    initialSnapshots: [
      createRuntimeOwnerInput(CoreOwnerDefinition, options.ir ?? scene('#ef4444')),
      createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, options.config ?? {}),
    ],
  });
  return { handle, session };
};

/** 编译一对固定 Runtime snapshot 与 canonical Patch，供内置 renderer 黑盒测试 */
const createCorePair = (currentSource: IRScene, nextSource: IRScene) => {
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, currentSource)],
  });
  const current = session.artifact(coreProgram).value.snapshot;
  session.update({
    baseRevision: session.revision(),
    owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, nextSource)],
  });
  const artifact = session.artifact(coreProgram).value;
  session.dispose();
  if (artifact.patch === undefined) throw new Error('expected incremental Core patch');
  return Object.freeze({ current, next: artifact.snapshot, patch: artifact.patch });
};

afterEach(() => vi.restoreAllMocks());

describe('builtin retained renderers', () => {
  it('SVG retained renderer 原子替换有序 readonly layers，rollback 恢复旧整帧', () => {
    const pair = createCorePair(scene('#ef4444'), scene('#22c55e'));
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const renderer = builtinRetainedRendererFactory({
      backend: 'svg',
      host,
      immutableOptions: { backend: 'svg', idPrefix: 'readonly-frame' },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
    const initialFrame = Object.freeze({ primary: pair.current, layers: readonlyLayersAt(4) });
    const nextFrame = Object.freeze({ primary: pair.next, layers: readonlyLayersAt(14) });
    const mount = executor.prepareMount(initialFrame, {}, 'create');

    mount.commit();
    mount.dispose();
    const committedFrame = executor.read().frame;
    expect(host.querySelector('[data-retikz-readonly-layer="guide"] rect')?.getAttribute('x')).toBe('4');
    expect(host.querySelector('[data-retikz-readonly-layer="guide"]')?.getAttribute('pointer-events')).toBe('none');
    expect(host.querySelector('[data-retikz-readonly-layer="guide"]')?.getAttribute('aria-hidden')).toBe('true');

    const invalidPrimitive = Object.defineProperty({}, 'type', {
      get: () => {
        throw new Error('invalid auxiliary Scene');
      },
    });
    const invalidLayers = [
      ...readonlyLayersAt(14),
      {
        key: 'invalid',
        transform: [1, 0, 0, 1, 0, 0],
        scene: {
          layout: { x: 0, y: 0, width: 1, height: 1 },
          primitives: [invalidPrimitive],
        },
      },
    ] as unknown as ReadonlyArray<RenderReadonlyLayer>;
    expect(() =>
      executor.prepare(pair.patch, Object.freeze({ primary: pair.next, layers: invalidLayers }), {}),
    ).toThrow('invalid auxiliary Scene');
    expect(host.querySelector('[data-retikz-readonly-layer="guide"] rect')?.getAttribute('x')).toBe('4');
    expect(executor.read().frame.layers).toBe(committedFrame.layers);

    const prepared = executor.prepare(pair.patch, nextFrame, {});
    prepared.commit();
    expect(host.querySelector('[data-retikz-readonly-layer="guide"] rect')?.getAttribute('x')).toBe('14');
    prepared.rollback();
    expect(host.querySelector('[data-retikz-readonly-layer="guide"] rect')?.getAttribute('x')).toBe('4');
    prepared.dispose();
    executor.dispose();
  });

  it('Canvas retained renderer 后绘 readonly layers，但 hit-test 仍只命中 primary topology', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const primary = createCorePair(scene('#ef4444'), scene('#22c55e')).current;
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(host);
    const click = vi.fn();
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'readonly-hit-test', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(
      Object.freeze({ primary, layers: readonlyLayersAt(0) }),
      {
        handlerContributions: [{ registration: 1, handlers: { 'node-a': { click }, 'node-b': { click } } }],
      },
      'create',
    );

    mount.commit();
    mount.dispose();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 50 }));

    expect(click).toHaveBeenCalledTimes(1);
    executor.dispose();
  });

  it('Canvas retained renderer 在 prepare 阶段收集并执行辅助 Scene 的 image resource', () => {
    class TestImage {
      static latest: TestImage | undefined;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = '';
      constructor() {
        TestImage.latest = this;
      }
    }
    vi.stubGlobal('Image', TestImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const primary = createCorePair(scene('#ef4444'), scene('#22c55e')).current;
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'readonly-image', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(
      Object.freeze({ primary, layers: imageReadonlyLayers('layer.png') }),
      {},
      'create',
    );
    const image = TestImage.latest;

    expect(image?.src).toBe('layer.png');
    mount.commit();
    mount.dispose();
    image?.onload?.(new Event('load'));
    expect(drawImage.mock.calls.some(([source]) => source === image)).toBe(true);
    executor.dispose();
  });

  it('SVG 完整索引跳过 root resource head 并递归映射 group topology', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { handle, session } = createSession('svg', host, {
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            clip: { kind: 'rect', x: -20, y: -20, width: 40, height: 40 },
            children: [
              {
                type: 'scope',
                children: [{ type: 'node', id: 'nested', position: [0, 0], text: 'nested' }],
              },
            ],
          },
        ],
      },
    });

    expect(host.querySelector('defs')).not.toBeNull();
    expect(host.querySelector('[data-retikz-id="nested"]')).not.toBeNull();
    expect(handle.read(session).frame.primary.topology.length).toBeGreaterThan(1);
    session.dispose();
  });

  it('SVG snapshotAt 完整索引递归映射静态 transform 包裹的 group topology', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { handle, session } = createSession('svg', host, {
      config: { animation: { enabled: false, snapshotAt: 150 } },
      ir: {
        version: 1,
        type: 'scene',
        viewBox: { x: -110, y: -75, width: 220, height: 150 },
        children: [
          {
            type: 'node',
            id: 'animated-group',
            position: [0, 0],
            shape: 'rectangle',
            fill: '#f97316',
            textColor: 'white',
            padding: { x: 28, y: 18 },
            text: 'animated',
            animations: [
              {
                property: 'scale',
                keyframes: [
                  { at: 0, value: 0.8 },
                  { at: 1, value: 1 },
                ],
                duration: 400,
                easing: 'ease-out',
                origin: 'center',
              },
            ],
          },
        ],
      },
    });

    expect(host.querySelector('[data-retikz-id="animated-group"]')).not.toBeNull();
    expect(handle.read(session).frame.primary.topology.length).toBeGreaterThan(1);
    session.dispose();
  });

  it('SVG snapshotAt 完整索引跳过静态 camera transform wrapper', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { session } = createSession('svg', host, {
      config: { animation: { enabled: false, snapshotAt: 150 } },
      ir: {
        version: 1,
        type: 'scene',
        viewBox: { x: 0, y: 0, width: 100, height: 100 },
        animations: [
          {
            property: 'viewBox',
            keyframes: [
              { at: 0, value: [0, 0, 100, 100] },
              { at: 1, value: [20, 20, 60, 60] },
            ],
            duration: 400,
          },
        ],
        children: [{ type: 'node', id: 'camera-child', position: [0, 0], text: 'camera' }],
      },
    });

    expect(host.querySelector('[data-retikz-id="camera-child"]')).not.toBeNull();
    session.dispose();
  });

  it('SVG 只接管 renderer-owned root attr/style，保留 host shell 外部状态', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    host.setAttribute('aria-label', 'external');
    host.setAttribute('data-shell', 'stable');
    host.style.setProperty('background-color', 'rgb(1, 2, 3)');
    const { session } = createSession('svg', host);
    const staticRead = createSession('svg', document.createElementNS(SVG_NAMESPACE, 'svg'));
    expect(staticRead.handle.read(staticRead.session).animation).toBeUndefined();
    staticRead.session.dispose();

    expect(host.getAttribute('aria-label')).toBe('external');
    expect(host.getAttribute('data-shell')).toBe('stable');
    expect(host.style.getPropertyValue('background-color')).toBe('rgb(1, 2, 3)');
    expect(host.getAttribute('viewBox')).not.toBeNull();

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
    });
    expect(host.getAttribute('aria-label')).toBe('external');
    expect(host.style.getPropertyValue('background-color')).toBe('rgb(1, 2, 3)');
    session.dispose();
  });

  it('SVG adopt 匹配时接管既有 node，mismatch 时原子回退 create', () => {
    const matchingHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const first = createSession('svg', matchingHost);
    const adoptedNode = matchingHost.querySelector('[data-retikz-id="node-a"]');
    first.session.dispose();

    const adopted = createSession('svg', matchingHost, { mountMode: 'adopt' });
    expect(matchingHost.querySelector('[data-retikz-id="node-a"]')).toBe(adoptedNode);
    adopted.session.dispose();

    const mismatchingHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const seed = createSession('svg', mismatchingHost);
    const staleNode = mismatchingHost.querySelector('[data-retikz-id="node-a"]');
    staleNode?.setAttribute('data-stale', 'true');
    seed.session.dispose();
    const mismatching = createSession('svg', mismatchingHost, { mountMode: 'adopt' });
    expect(mismatchingHost.querySelector('[data-retikz-id="node-a"]')).not.toBe(staleNode);
    expect(mismatchingHost.querySelector('[data-stale]')).toBeNull();
    mismatching.session.dispose();
  });

  it('SVG handler contributions 按 registration 更新、移除并隔离单 callback failure', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const calls: Array<string> = [];
    const first = vi.fn(() => calls.push('first'));
    const second = vi.fn(() => calls.push('second'));
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const { session } = createSession('svg', host, {
      config: {
        handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: first } } }],
      },
    });
    const node = host.querySelector('[data-retikz-id="node-a"]');
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toEqual(['first']);

    const throwing = vi.fn(() => {
      throw new Error('isolated');
    });
    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          handlerContributions: [
            { registration: 1, handlers: { 'node-a': { click: throwing } } },
            { registration: 2, handlers: { 'node-a': { click: second } } },
          ],
        }),
      ],
    });
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'isolated' }));
    expect(calls).toEqual(['first', 'second']);

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          handlerContributions: [{ registration: 2, handlers: { 'node-a': { click: second } } }],
        }),
      ],
    });
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toEqual(['first', 'second', 'second']);
    session.dispose();
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(calls).toEqual(['first', 'second', 'second']);
    vi.unstubAllGlobals();
  });

  it('SVG hydration 在 renderer commit 内先解绑旧 router，再向后序 participant 暴露新 mapping', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const first = vi.fn();
    const second = vi.fn();
    const probe = defineRuntimeCommitParticipant<Readonly<{ ok: true }>>({
      key: 'z:hydration-probe',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: candidate => ({
        commit: () => {
          if (candidate.phase === RuntimeProgramPhase.Update) {
            host.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        },
        rollback: () => undefined,
        dispose: () => undefined,
      }),
      read: () => Object.freeze({ ok: true as const }),
      dispose: () => undefined,
    });
    const { session } = createSession('svg', host, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: first } } }] },
      participants: [probe],
    });
    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          handlerContributions: [{ registration: 2, handlers: { 'node-a': { click: second } } }],
        }),
      ],
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    session.dispose();
  });

  it('SVG 与 Canvas hydration 接受同一 semantic owner 发射多个 primitive，并为匿名 occurrence 继承唯一 public id', () => {
    const root = createRuntimeIdentity('multi-primitive-owner', ['root']);
    const owner = createRuntimeIdentity('multi-primitive-owner', ['owner']);
    const identities = [
      createRuntimeIdentity('multi-primitive-owner', ['owner', 'shape']),
      createRuntimeIdentity('multi-primitive-owner', ['owner', 'label']),
      createRuntimeIdentity('multi-primitive-owner', ['owner', 'anonymous']),
    ];
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 300,
      trigger: 'manual' as const,
    };
    const anonymousAnimation = { ...animation, trigger: { onEvent: 'click' } as const };
    const snapshot: SceneRuntimeSnapshot = {
      revision: 0 as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives: [
          {
            type: 'rect',
            id: 'owner',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            fill: '#ef4444',
            animations: [animation],
          },
          {
            type: 'rect',
            id: 'owner',
            x: 40,
            y: 0,
            width: 20,
            height: 20,
            fill: '#3b82f6',
            animations: [animation],
          },
          {
            type: 'rect',
            meta: { source: 'anonymous' },
            x: 80,
            y: 0,
            width: 20,
            height: 20,
            fill: '#22c55e',
            animations: [anonymousAnimation],
          },
        ],
      },
      topology: [
        {
          identity: identities[0],
          semanticOwner: owner,
          parent: root,
          order: 0,
          primitivePath: [0],
          publicId: 'owner',
        },
        {
          identity: identities[1],
          semanticOwner: owner,
          parent: root,
          order: 1,
          primitivePath: [1],
          publicId: 'owner',
        },
        {
          identity: identities[2],
          semanticOwner: owner,
          parent: root,
          order: 2,
          primitivePath: [2],
        },
      ],
    };
    const svgHandler = vi.fn();
    let svgAnimation: HydrationAnimationControls | undefined;
    let svgContext: HydrationContext | undefined;
    svgHandler.mockImplementation((_event, context) => {
      svgAnimation = context.animation;
      svgContext = context;
    });
    const svgConfig = {
      handlerContributions: [{ registration: 1, handlers: { owner: { click: svgHandler } } }],
    } as const;

    const svgHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const svgRenderer = builtinRetainedRendererFactory({
      backend: 'svg',
      host: svgHost,
      immutableOptions: { backend: 'svg', idPrefix: 'multi-owner-svg' },
    });
    const svgExecutor = getRetainedRendererExecutor(svgRenderer);
    if (svgExecutor === undefined) throw new Error('expected builtin SVG renderer executor');
    const svgMount = svgExecutor.prepareMount(frameOf(snapshot), svgConfig, 'create');
    svgMount.commit();
    svgMount.dispose();
    const svgAnimations = Array.from(svgHost.querySelectorAll('[data-retikz-anim]'), element => {
      const animationRecord = {
        cancel: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        finish: vi.fn(),
        currentTime: 0 as number | null,
      };
      Object.defineProperty(element, 'getAnimations', { configurable: true, value: () => [animationRecord] });
      return animationRecord;
    });
    expect(svgAnimations).toHaveLength(3);
    svgHost
      .querySelectorAll('rect')
      .item(2)
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(svgHandler).toHaveBeenCalledTimes(1);
    expect(svgContext?.meta).toEqual({ source: 'anonymous' });
    expect(svgContext?.geometry?.bbox).toEqual({ x: 0, y: 0, width: 100, height: 20 });
    svgAnimation?.restart();
    expect(svgAnimations.every(item => item.cancel.mock.calls.length === 1 && item.play.mock.calls.length === 1)).toBe(
      true,
    );
    svgAnimation?.seek(150, 'owner');
    expect(svgAnimations.map(item => item.currentTime)).toEqual([150, 150, 150]);
    svgExecutor.dispose();

    const alphaValues: Array<number> = [];
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const state = { canvas: this, globalAlpha: 1 };
      const alphaStack: Array<number> = [];
      return new Proxy(state as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'save') return () => alphaStack.push(target.globalAlpha);
          if (key === 'restore') return () => (target.globalAlpha = alphaStack.pop() ?? 1);
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && typeof value === 'number') alphaValues.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const canvasHost = document.createElement('canvas');
    canvasHost.width = 100;
    canvasHost.height = 40;
    canvasHost.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    let canvasAnimation: HydrationAnimationControls | undefined;
    let canvasContext: HydrationContext | undefined;
    const canvasHandler = vi.fn((_event, context) => {
      canvasAnimation = context.animation;
      canvasContext = context;
    });
    const canvasConfig = {
      handlerContributions: [{ registration: 1, handlers: { owner: { click: canvasHandler } } }],
    } as const;
    const canvasRenderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host: canvasHost,
      immutableOptions: { backend: 'canvas', idPrefix: 'multi-owner-canvas', devicePixelRatio: 1 },
    });
    const canvasExecutor = getRetainedRendererExecutor(canvasRenderer);
    if (canvasExecutor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const canvasMount = canvasExecutor.prepareMount(frameOf(snapshot), canvasConfig, 'create');
    expect(() => canvasMount.commit()).not.toThrow();
    canvasMount.dispose();
    expect(requestFrame).not.toHaveBeenCalled();
    canvasHost.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 90, clientY: 10 }));
    expect(canvasHandler).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(canvasContext?.meta).toEqual({ source: 'anonymous' });
    expect(canvasContext?.geometry?.bbox).toEqual({ x: 0, y: 0, width: 100, height: 20 });
    alphaValues.length = 0;
    canvasAnimation?.restart();
    expect(alphaValues.filter(value => value === 0)).toHaveLength(3);
    alphaValues.length = 0;
    canvasAnimation?.seek(150, 'owner');
    expect(alphaValues.filter(value => Math.abs(value - 0.5) < 0.01)).toHaveLength(3);
    canvasExecutor.dispose();
  });

  it('Canvas 合成 pointerLeave context 按 previous public id 控制 occurrence', () => {
    const root = createRuntimeIdentity('canvas-leave-animation', ['root']);
    const identities = ['a', 'b'].map(id => createRuntimeIdentity('canvas-leave-animation', [id]));
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 300,
      trigger: 'manual' as const,
    };
    const snapshot: SceneRuntimeSnapshot = {
      revision: 0 as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives: [
          { type: 'rect', id: 'a', x: 0, y: 0, width: 20, height: 20, fill: '#ef4444', animations: [animation] },
          { type: 'rect', id: 'b', x: 40, y: 0, width: 20, height: 20, fill: '#3b82f6', animations: [animation] },
        ],
      },
      topology: identities.map((identity, index) => ({
        identity,
        semanticOwner: identity,
        parent: root,
        order: index,
        primitivePath: [index],
        publicId: index === 0 ? 'a' : 'b',
      })),
    };
    const fills: Array<Readonly<{ x: number; alpha: number }>> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const state = { canvas: this, globalAlpha: 1, currentX: 0 };
      const alphaStack: Array<number> = [];
      return new Proxy(state as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'save') return () => alphaStack.push(target.globalAlpha);
          if (key === 'restore') return () => (target.globalAlpha = alphaStack.pop() ?? 1);
          if (key === 'rect') return (x: number) => (state.currentX = x);
          if (key === 'isPointInPath')
            return (x: number, y: number) => x >= state.currentX && x <= state.currentX + 20 && y >= 0 && y <= 20;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'fill')
            return () => {
              if (this.isConnected) fills.push(Object.freeze({ x: state.currentX, alpha: target.globalAlpha }));
            };
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 100;
    host.height = 40;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(host);
    let leaveA: HydrationAnimationControls | undefined;
    let leaveB: HydrationAnimationControls | undefined;
    const config = {
      handlerContributions: [
        {
          registration: 1,
          handlers: {
            a: { pointerLeave: (_event: Event, context: HydrationContext) => (leaveA = context.animation) },
            b: {
              pointerEnter: () => undefined,
              pointerLeave: (_event: Event, context: HydrationContext) => (leaveB = context.animation),
            },
          },
        },
      ],
    } as const;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-leave-animation', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(snapshot), config, 'create');
    mount.commit();
    mount.dispose();

    host.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 10 }));
    host.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 50, clientY: 10 }));
    expect(leaveA).toBeDefined();
    fills.length = 0;
    leaveA?.seek(150);
    expect(fills.slice(-2)).toEqual([
      { x: 0, alpha: 0.5 },
      { x: 40, alpha: 1 },
    ]);
    leaveA?.stop();

    host.dispatchEvent(new MouseEvent('pointerleave', { clientX: 120, clientY: 50 }));
    expect(leaveB).toBeDefined();
    fills.length = 0;
    leaveB?.seek(150);
    expect(fills.slice(-2)).toEqual([
      { x: 0, alpha: 1 },
      { x: 40, alpha: 0.5 },
    ]);
    executor.dispose();
  });

  it('SVG 与 Canvas commit 在旧 hydration 解绑前失败时 rollback 不重复绑定 listener', () => {
    const svgHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const svgHandler = vi.fn();
    const svg = createSession('svg', svgHost, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: svgHandler } } }] },
    });
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: () => {
        throw new Error('reject SVG animation commit');
      },
    });
    try {
      expect(() =>
        svg.session.update({
          baseRevision: svg.session.revision(),
          owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, animatedScene('#22c55e', 'manual'))],
        }),
      ).toThrow();
      svgHost.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(svgHandler).toHaveBeenCalledTimes(1);
    } finally {
      svg.session.dispose();
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const canvasHost = document.createElement('canvas');
    canvasHost.width = 200;
    canvasHost.height = 100;
    canvasHost.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const canvasHandler = vi.fn();
    const canvas = createSession('canvas', canvasHost, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-b': { click: canvasHandler } } }] },
    });
    vi.stubGlobal('requestAnimationFrame', () => {
      throw new Error('reject Canvas animation commit');
    });
    const autoplayScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'node-a',
          position: [0, 0],
          animations: [
            {
              property: 'opacity',
              keyframes: [
                { at: 0, value: 0 },
                { at: 1, value: 1 },
              ],
              duration: 300,
              trigger: 'load',
            },
          ],
        },
      ],
    };
    expect(() =>
      canvas.session.update({
        baseRevision: canvas.session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, autoplayScene)],
      }),
    ).toThrow();
    canvasHost.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 50 }));
    expect(canvasHandler).toHaveBeenCalledTimes(1);
    canvas.session.dispose();
    vi.unstubAllGlobals();
  });

  it('旧 hydration 部分解绑失败后 rollback 重建完整 listener 集合', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    const { session } = createSession('svg', host, {
      config: {
        handlerContributions: [
          { registration: 1, handlers: { 'node-a': { click: onClick, doubleClick: onDoubleClick } } },
        ],
      },
    });
    const originalRemove = host.removeEventListener.bind(host);
    let rejectDoubleClickRemoval = true;
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && rejectDoubleClickRemoval) {
        rejectDoubleClickRemoval = false;
        throw new Error('old dblclick removal rejected');
      }
      originalRemove(type, listener, options);
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ParticipantCommitFailed,
        cause: expect.objectContaining({ message: 'old dblclick removal rejected' }),
      }),
    );

    const target = host.querySelector('[data-retikz-id="node-a"]');
    target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    target?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDoubleClick).toHaveBeenCalledTimes(1);
    session.dispose();
  });

  it('旧 hydration 连续解绑失败时仍回滚 DOM，并把 session 置为 broken 而非返回残缺 idle', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { session } = createSession('svg', host, {
      config: {
        handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: vi.fn(), doubleClick: vi.fn() } } }],
      },
    });
    const committedMarkup = host.innerHTML;
    const originalRemove = host.removeEventListener.bind(host);
    let rejectedRemovals = 0;
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && rejectedRemovals < 2) {
        rejectedRemovals += 1;
        throw new Error(`old dblclick removal rejected ${rejectedRemovals.toString()}`);
      }
      originalRemove(type, listener, options);
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantRollbackFailed }));
    expect(host.innerHTML).toBe(committedMarkup);
    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#3b82f6'))],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantRollbackFailed }));
    expect(() => session.dispose()).not.toThrow();
  });

  it('Canvas 旧 hydration 部分解绑失败后 rollback 重建完整 listener 集合', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const pair = createCorePair(scene('#ef4444'), scene('#22c55e'));
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const add = vi.spyOn(host, 'addEventListener');
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-hydration-rollback', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const config = {
      handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: vi.fn(), doubleClick: vi.fn() } } }],
    };
    const mount = executor.prepareMount(frameOf(pair.current), config, 'create');
    mount.commit();
    mount.dispose();
    add.mockClear();
    const originalRemove = host.removeEventListener.bind(host);
    let rejectDoubleClickRemoval = true;
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && rejectDoubleClickRemoval) {
        rejectDoubleClickRemoval = false;
        throw new Error('old Canvas dblclick removal rejected');
      }
      originalRemove(type, listener, options);
    });
    const prepared = executor.prepare(pair.patch, frameOf(pair.next), config);

    expect(() => prepared.commit()).toThrow('old Canvas dblclick removal rejected');
    expect(() => prepared.rollback()).not.toThrow();
    expect(add.mock.calls.map(([type]) => type)).toEqual(['click', 'dblclick']);
    prepared.dispose();
    executor.dispose();
  });

  it('candidate hydration 注册与清理同时失败时保留注册 primary 并在 rollback 清除 listener', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const previous = vi.fn();
    const candidateClick = vi.fn();
    const { session } = createSession('svg', host, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: previous } } }] },
    });
    const originalAdd = host.addEventListener.bind(host);
    const originalRemove = host.removeEventListener.bind(host);
    let rejectCandidateDoubleClick = true;
    let rejectCandidateClickCleanup = true;
    let candidateSetupFailed = false;
    vi.spyOn(host, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && rejectCandidateDoubleClick) {
        rejectCandidateDoubleClick = false;
        candidateSetupFailed = true;
        throw new Error('candidate dblclick registration rejected');
      }
      originalAdd(type, listener, options);
    });
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'click' && candidateSetupFailed && rejectCandidateClickCleanup) {
        rejectCandidateClickCleanup = false;
        throw new Error('candidate click cleanup rejected');
      }
      originalRemove(type, listener, options);
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [
          createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
            handlerContributions: [
              {
                registration: 2,
                handlers: { 'node-a': { click: candidateClick, doubleClick: vi.fn() } },
              },
            ],
          }),
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ParticipantCommitFailed,
        cause: expect.objectContaining({ message: 'candidate dblclick registration rejected' }),
      }),
    );

    host.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previous).toHaveBeenCalledTimes(1);
    expect(candidateClick).not.toHaveBeenCalled();
    session.dispose();
  });

  it('candidate hydration cleanup 连续失败时仍完成旧 DOM/router 恢复，并把清理失败报告为 rollback failure', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const previous = vi.fn();
    const candidateClick = vi.fn();
    const { session } = createSession('svg', host, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: previous } } }] },
    });
    const committedMarkup = host.innerHTML;
    const originalAdd = host.addEventListener.bind(host);
    const originalRemove = host.removeEventListener.bind(host);
    let candidateSetupFailed = false;
    let rejectedCandidateCleanups = 0;
    vi.spyOn(host, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && !candidateSetupFailed) {
        candidateSetupFailed = true;
        throw new Error('candidate dblclick registration rejected');
      }
      originalAdd(type, listener, options);
    });
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'click' && candidateSetupFailed && rejectedCandidateCleanups < 2) {
        rejectedCandidateCleanups += 1;
        throw new Error(`candidate click cleanup rejected ${rejectedCandidateCleanups.toString()}`);
      }
      originalRemove(type, listener, options);
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [
          createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
            handlerContributions: [
              {
                registration: 2,
                handlers: { 'node-a': { click: candidateClick, doubleClick: vi.fn() } },
              },
            ],
          }),
        ],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ParticipantRollbackFailed,
        cause: expect.objectContaining({
          trigger: expect.objectContaining({
            cause: expect.objectContaining({ message: 'candidate dblclick registration rejected' }),
          }),
          rollback: expect.objectContaining({ message: 'candidate click cleanup rejected 2' }),
        }),
      }),
    );
    expect(host.innerHTML).toBe(committedMarkup);
    host.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previous).toHaveBeenCalledTimes(1);
    expect(candidateClick).not.toHaveBeenCalled();
    expect(() => session.dispose()).not.toThrow();
  });

  it('candidate hydration cleanup 三次失败后由公开 Session dispose 重试残留 listener', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const previous = vi.fn();
    const candidateClick = vi.fn();
    const { session } = createSession('svg', host, {
      config: { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: previous } } }] },
    });
    const originalAdd = host.addEventListener.bind(host);
    const originalRemove = host.removeEventListener.bind(host);
    let candidateSetupFailed = false;
    let rejectedCandidateCleanups = 0;
    vi.spyOn(host, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'dblclick' && !candidateSetupFailed) {
        candidateSetupFailed = true;
        throw new Error('candidate dblclick registration rejected');
      }
      originalAdd(type, listener, options);
    });
    vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'click' && candidateSetupFailed && rejectedCandidateCleanups < 3) {
        rejectedCandidateCleanups += 1;
        throw new Error(`candidate click cleanup rejected ${rejectedCandidateCleanups.toString()}`);
      }
      originalRemove(type, listener, options);
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [
          createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
            handlerContributions: [
              {
                registration: 2,
                handlers: { 'node-a': { click: candidateClick, doubleClick: vi.fn() } },
              },
            ],
          }),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantRollbackFailed }));

    expect(() => session.dispose()).not.toThrow();
    host.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(previous).not.toHaveBeenCalled();
    expect(candidateClick).not.toHaveBeenCalled();
    expect(rejectedCandidateCleanups).toBe(3);
  });

  it('SVG renderer dispose 在 hydration 失败后仍释放动画并允许重试 listener cleanup', () => {
    const snapshot = createCorePair(scene('#ef4444'), animatedScene('#22c55e', { onEvent: 'click' })).next;
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const cancel = vi.fn();
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'running' }),
    });
    try {
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-dispose-failure' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(
        frameOf(snapshot),
        { handlerContributions: [{ registration: 1, handlers: { 'node-a': { click: vi.fn() } } }] },
        'create',
      );
      mount.commit();
      mount.dispose();
      host.querySelector('[data-retikz-id="node-a"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const originalRemove = host.removeEventListener.bind(host);
      let rejectRemoval = true;
      const remove = vi.spyOn(host, 'removeEventListener').mockImplementation((type, listener, options) => {
        if (type === 'click' && rejectRemoval) {
          rejectRemoval = false;
          throw new Error('final hydration cleanup rejected');
        }
        originalRemove(type, listener, options);
      });

      expect(() => executor.dispose()).toThrow('final hydration cleanup rejected');
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(() => executor.dispose()).not.toThrow();
      expect(remove.mock.calls.filter(([type]) => type === 'click')).toHaveLength(2);
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('Canvas clock cleanup 失败时仍释放 visibility listener 并只重试失败 clock', () => {
    const animated: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'visible',
          position: [0, 0],
          animations: [
            {
              property: 'opacity',
              keyframes: [
                { at: 0, value: 0 },
                { at: 1, value: 1 },
              ],
              duration: 300,
              trigger: 'visible',
            },
          ],
        },
        {
          type: 'node',
          id: 'autoplay',
          position: [40, 0],
          animations: [
            {
              property: 'opacity',
              keyframes: [
                { at: 0, value: 0 },
                { at: 1, value: 1 },
              ],
              duration: 300,
            },
          ],
        },
      ],
    };
    const snapshot = createCorePair(scene('#ef4444'), animated).next;
    let frameSequence = 0;
    let clockFrame: number | undefined;
    let rejectClockCleanup = true;
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn((frame: number) => {
      if (frame === clockFrame && rejectClockCleanup) {
        rejectClockCleanup = false;
        throw new Error('clock cleanup rejected');
      }
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const remove = vi.spyOn(window, 'removeEventListener');
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-dispose-failure', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      mount.commit();
      mount.dispose();
      clockFrame = requestFrame.mock.results.at(-1)?.value;
      if (clockFrame === undefined) throw new Error('expected active Canvas animation clock');

      expect(() => executor.dispose()).toThrow('clock cleanup rejected');
      expect(remove.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
      expect(remove.mock.calls.some(([type]) => type === 'resize')).toBe(true);
      expect(() => executor.dispose()).not.toThrow();
      expect(() => executor.dispose()).not.toThrow();
      expect(cancelFrame.mock.calls.filter(([frame]) => frame === clockFrame)).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas animation dispose 同步重入时不重复取消 clock frame', () => {
    const snapshot = createCorePair(scene('#ef4444'), canvasLifecycleScene(300)).next;
    let frameSequence = 0;
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn((frame: number) => {
      void frame;
      controlsRef.current?.dispose();
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-dispose-reentry', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
    mount.commit();
    mount.dispose();
    const controls = executor.read().animation;
    controlsRef.current = controls;

    expect(() => controls?.dispose()).not.toThrow();
    expect(cancelFrame).toHaveBeenCalledTimes(2);
    expect(new Set(cancelFrame.mock.calls.map(([frame]) => frame)).size).toBe(2);
    executor.dispose();
    vi.unstubAllGlobals();
  });

  it('Canvas clock replacement 清理同步重入 dispose 后不再创建新 clock', () => {
    const current = createCorePair(scene('#ef4444'), canvasLifecycleScene(300)).next;
    const next: SceneRuntimeSnapshot = {
      ...current,
      revision: (Number(current.revision) + 1) as SceneRuntimeSnapshot['revision'],
    };
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [],
    };
    let frameSequence = 0;
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn(() => controlsRef.current?.dispose());
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-clock-replace-reentry', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(current), {}, 'create');
      mount.commit();
      mount.dispose();
      const controls = executor.read().animation;
      controlsRef.current = controls;
      const prepared = executor.prepare(patch, frameOf(next), {});
      const requestedBeforeCommit = requestFrame.mock.calls.length;

      expect(() => prepared.commit()).not.toThrow();
      expect(requestFrame).toHaveBeenCalledTimes(requestedBeforeCommit);
      expect(controls?.running).toBe(false);
      prepared.dispose();
      expect(() => executor.dispose()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas visibility cleanup 失败后回调失活且只重试失败项', () => {
    const snapshot = createCorePair(scene('#ef4444'), animatedScene('#22c55e', 'visible')).next;
    let frameSequence = 0;
    const pendingFrames = new Map<number, FrameRequestCallback>();
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const originalRemove = window.removeEventListener.bind(window);
    let rejectScrollRemoval = true;
    const remove = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'scroll' && rejectScrollRemoval) {
        rejectScrollRemoval = false;
        throw new Error('scroll cleanup rejected');
      }
      originalRemove(type, listener, options);
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visibility-dispose', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      mount.commit();
      mount.dispose();
      const getBoundingClientRect = vi.spyOn(host, 'getBoundingClientRect');

      expect(() => executor.dispose()).toThrow('scroll cleanup rejected');
      expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
      expect(cancelFrame).toHaveBeenCalledTimes(1);
      window.dispatchEvent(new Event('scroll'));
      for (const callback of pendingFrames.values()) callback(0);
      expect(getBoundingClientRect).not.toHaveBeenCalled();

      expect(() => executor.dispose()).not.toThrow();
      expect(() => executor.dispose()).not.toThrow();
      expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(2);
      expect(remove.mock.calls.filter(([type]) => type === 'resize')).toHaveLength(1);
      expect(cancelFrame).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas visibility rAF 注册同步 dispose 后立即取消并保留失败 frame 重试', () => {
    const snapshot = createCorePair(scene('#ef4444'), animatedScene('#22c55e', 'visible')).next;
    let frameSequence = 0;
    let reenterOnRequest = false;
    let reentrantFrame: number | undefined;
    let rejectReentrantCleanup = true;
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const pendingFrames = new Map<number, FrameRequestCallback>();
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      if (reenterOnRequest) {
        reenterOnRequest = false;
        reentrantFrame = frame;
        controlsRef.current?.dispose();
      }
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => {
      if (frame === reentrantFrame && rejectReentrantCleanup) {
        rejectReentrantCleanup = false;
        throw new Error('reentrant visibility frame cleanup rejected');
      }
      pendingFrames.delete(frame);
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    let scheduleVisibility: EventListener | undefined;
    const originalAdd = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'scroll' && typeof listener === 'function') scheduleVisibility = listener;
      originalAdd(type, listener, options);
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visibility-register-reentry', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      mount.commit();
      mount.dispose();
      const controls = executor.read().animation;
      controlsRef.current = controls;
      const initialFrame = requestFrame.mock.results[0]?.value;
      if (initialFrame === undefined) throw new Error('expected initial visibility frame');
      const initialCallback = pendingFrames.get(initialFrame);
      if (initialCallback === undefined) throw new Error('expected initial visibility callback');
      pendingFrames.delete(initialFrame);
      initialCallback(0);
      reenterOnRequest = true;
      if (scheduleVisibility === undefined) throw new Error('expected Canvas visibility schedule listener');

      expect(() => scheduleVisibility?.(new Event('scroll'))).toThrow('reentrant visibility frame cleanup rejected');

      expect(reentrantFrame).toBeDefined();
      expect(pendingFrames.size).toBe(1);
      expect(() => controls?.dispose()).not.toThrow();
      expect(pendingFrames.size).toBe(0);
      expect(cancelFrame.mock.calls.some(([frame]) => frame === reentrantFrame)).toBe(true);
      expect(() => executor.dispose()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas visibility rAF 同步执行 callback 后不回写已消费 frame', () => {
    const snapshot = createCorePair(scene('#ef4444'), animatedScene('#22c55e', 'visible')).next;
    let frameSequence = 0;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return ++frameSequence;
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visibility-sync-frame', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      mount.commit();
      mount.dispose();
      expect(requestFrame).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('scroll'));

      expect(requestFrame).toHaveBeenCalledTimes(2);
      executor.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas visibility setup 与 cleanup 连续失败时保留 setup primary 到 renderer dispose', () => {
    const snapshot = createCorePair(scene('#ef4444'), animatedScene('#22c55e', 'visible')).next;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const originalAdd = window.addEventListener.bind(window);
    const originalRemove = window.removeEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'resize') throw new Error('visibility setup rejected');
      originalAdd(type, listener, options);
    });
    let cleanupRejects = 4;
    const remove = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'scroll' && cleanupRejects > 0) {
        cleanupRejects -= 1;
        throw new Error(`visibility cleanup rejected ${String(4 - cleanupRejects)}`);
      }
      originalRemove(type, listener, options);
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visibility-setup', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');

      expect(() => mount.commit()).toThrow('visibility setup rejected');
      expect(() => mount.rollback()).toThrow('visibility cleanup rejected 3');
      expect(() => mount.dispose()).toThrow('visibility cleanup rejected 4');
      expect(() => executor.dispose()).not.toThrow();
      expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(5);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas candidate animation cleanup 跨 rollback/token 连续失败后由 renderer dispose 重试', () => {
    const pair = createCorePair(canvasLifecycleScene(300), canvasLifecycleScene(600));
    let frameSequence = 0;
    const candidateFrameRef: { current?: number } = {};
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn((frame: number) => {
      if (
        frame === candidateFrameRef.current &&
        cancelFrame.mock.calls.filter(([value]) => value === frame).length <= 2
      ) {
        throw new Error(`candidate clock cleanup rejected ${String(cancelFrame.mock.calls.length)}`);
      }
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-candidate-cleanup', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    mount.commit();
    mount.dispose();
    const originalAdd = host.addEventListener.bind(host);
    vi.spyOn(host, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'click') throw new Error('candidate hydration rejected');
      originalAdd(type, listener, options);
    });
    const prepared = executor.prepare(pair.patch, frameOf(pair.next), {
      animation: { enabled: true },
      handlerContributions: [{ registration: 1, handlers: { visible: { click: vi.fn() } } }],
    });

    expect(() => prepared.commit()).toThrow('candidate hydration rejected');
    const candidateFrame = requestFrame.mock.results.at(-1)?.value;
    if (candidateFrame === undefined) throw new Error('expected candidate Canvas clock frame');
    candidateFrameRef.current = candidateFrame;
    expect(() => prepared.rollback()).toThrow();
    expect(() => prepared.dispose()).toThrow();
    expect(() => executor.dispose()).not.toThrow();
    expect(cancelFrame.mock.calls.filter(([frame]) => frame === candidateFrame)).toHaveLength(3);
    vi.unstubAllGlobals();
  });

  it('Canvas previous animation suspend 失败后 rollback 恢复 committed running state', () => {
    const pair = createCorePair(canvasLifecycleScene(300), canvasLifecycleScene(600));
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-suspend-rollback', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    mount.commit();
    mount.dispose();
    const previousControls = executor.read().animation;
    expect(previousControls?.running).toBe(true);
    const originalRemove = window.removeEventListener.bind(window);
    let rejectScrollRemoval = true;
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'scroll' && rejectScrollRemoval) {
        rejectScrollRemoval = false;
        throw new Error('previous visibility suspend rejected');
      }
      originalRemove(type, listener, options);
    });
    const prepared = executor.prepare(pair.patch, frameOf(pair.next), { animation: { enabled: true } });

    expect(() => prepared.commit()).toThrow('previous visibility suspend rejected');
    expect(() => prepared.rollback()).not.toThrow();
    prepared.dispose();
    expect(executor.read().animation).toBe(previousControls);
    expect(previousControls?.running).toBe(true);
    executor.dispose();
    vi.unstubAllGlobals();
  });

  it('Canvas rollback visibility listener 注册同步 dispose 后不泄漏 listener 或重启 clock', () => {
    const pair = createCorePair(canvasLifecycleScene(300), canvasLifecycleScene(600));
    let frameSequence = 0;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => ++frameSequence),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const activeScrollListeners = new Set<EventListenerOrEventListenerObject>();
    const originalWindowAdd = window.addEventListener.bind(window);
    const originalWindowRemove = window.removeEventListener.bind(window);
    let reenterOnScrollRegistration = false;
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'scroll' && reenterOnScrollRegistration) {
        reenterOnScrollRegistration = false;
        controlsRef.current?.dispose();
      }
      originalWindowAdd(type, listener, options);
      if (type === 'scroll') activeScrollListeners.add(listener);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      originalWindowRemove(type, listener, options);
      if (type === 'scroll') activeScrollListeners.delete(listener);
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-resume-register-reentry', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
      mount.commit();
      mount.dispose();
      const previousControls = executor.read().animation;
      controlsRef.current = previousControls;
      const originalHostAdd = host.addEventListener.bind(host);
      vi.spyOn(host, 'addEventListener').mockImplementation((type, listener, options) => {
        if (type === 'click') throw new Error('candidate hydration rejected');
        originalHostAdd(type, listener, options);
      });
      const prepared = executor.prepare(pair.patch, frameOf(pair.next), {
        animation: { enabled: true },
        handlerContributions: [{ registration: 1, handlers: { visible: { click: vi.fn() } } }],
      });
      expect(() => prepared.commit()).toThrow('candidate hydration rejected');
      reenterOnScrollRegistration = true;

      expect(() => prepared.rollback()).not.toThrow();

      expect(activeScrollListeners.size).toBe(0);
      expect(previousControls?.running).toBe(false);
      prepared.dispose();
      expect(() => executor.dispose()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas public pause 失败时保留 coarse play intent', () => {
    const current = createCorePair(scene('#ef4444'), animatedScene('#22c55e', 'manual')).next;
    const next: SceneRuntimeSnapshot = {
      ...current,
      revision: (Number(current.revision) + 1) as SceneRuntimeSnapshot['revision'],
    };
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [],
    };
    let frameSequence = 0;
    let rejectPause = false;
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn(() => {
      if (rejectPause) {
        rejectPause = false;
        throw new Error('public pause rejected');
      }
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-coarse-pause-failure', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(current), {}, 'create');
      mount.commit();
      mount.dispose();
      const controls = executor.read().animation;
      controls?.play();
      rejectPause = true;
      expect(() => controls?.pause()).toThrow('public pause rejected');
      expect(controls?.running).toBe(true);
      const prepared = executor.prepare(patch, frameOf(next), {});

      prepared.commit();

      expect(controls?.running).toBe(true);
      prepared.dispose();
      executor.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas clock pause 取消失败后 rollback 不会遗留两条 rAF 链', () => {
    const pair = createCorePair(canvasLifecycleScene(300), canvasLifecycleScene(600));
    let frameSequence = 0;
    let previousClockFrame: number | undefined;
    let rejectPreviousClockCleanup = true;
    const pendingFrames = new Map<number, FrameRequestCallback>();
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const frame = ++frameSequence;
      pendingFrames.set(frame, callback);
      return frame;
    });
    const cancelFrame = vi.fn((frame: number) => {
      if (frame === previousClockFrame && rejectPreviousClockCleanup) {
        rejectPreviousClockCleanup = false;
        throw new Error('previous clock pause rejected');
      }
      pendingFrames.delete(frame);
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    try {
      const host = document.createElement('canvas');
      const renderer = builtinRetainedRendererFactory({
        backend: 'canvas',
        host,
        immutableOptions: { backend: 'canvas', idPrefix: 'canvas-clock-pause-rollback', devicePixelRatio: 1 },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
      const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
      mount.commit();
      mount.dispose();
      const previousControls = executor.read().animation;
      previousClockFrame = requestFrame.mock.results[1]?.value;
      if (previousClockFrame === undefined) throw new Error('expected committed Canvas clock frame');
      const previousTick = pendingFrames.get(previousClockFrame);
      if (previousTick === undefined) throw new Error('expected pending Canvas clock callback');
      const prepared = executor.prepare(pair.patch, frameOf(pair.next), { animation: { enabled: true } });

      expect(() => prepared.commit()).toThrow('previous clock pause rejected');
      expect(() => prepared.rollback()).not.toThrow();
      expect(pendingFrames.size).toBe(2);
      pendingFrames.delete(previousClockFrame);
      previousTick(0);
      expect(pendingFrames.size).toBe(2);
      expect(previousControls?.running).toBe(true);
      prepared.dispose();
      executor.dispose();
      expect(pendingFrames.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('Canvas clock replacement 恢复也失败时保留 trigger primary 并由 rollback 重试', () => {
    const current = createCorePair(scene('#ef4444'), canvasLifecycleScene(300)).next;
    const next: SceneRuntimeSnapshot = {
      ...current,
      revision: (Number(current.revision) + 1) as SceneRuntimeSnapshot['revision'],
    };
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [],
    };
    let frameSequence = 0;
    const visibilityFrameRef: { current?: number } = {};
    let clockCleanupRejects = 2;
    const requestFrame = vi.fn(() => ++frameSequence);
    const cancelFrame = vi.fn((frame: number) => {
      if (frame === visibilityFrameRef.current && clockCleanupRejects > 0) {
        const attempt = 3 - clockCleanupRejects;
        clockCleanupRejects -= 1;
        throw new Error(`clock replacement cleanup rejected ${String(attempt)}`);
      }
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key === 'measureText' ? () => ({ width: 0 }) : (Reflect.get(target, key) ?? vi.fn())),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-clock-recovery', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    const previousControls = executor.read().animation;
    const visibilityFrame = requestFrame.mock.results[0]?.value;
    if (visibilityFrame === undefined) throw new Error('expected committed Canvas visibility frame');
    visibilityFrameRef.current = visibilityFrame;
    const prepared = executor.prepare(patch, frameOf(next), {});

    expect(() => prepared.commit()).toThrow('clock replacement cleanup rejected 1');
    let rollbackFailure: unknown;
    try {
      prepared.rollback();
    } catch (cause) {
      rollbackFailure = cause;
    }
    expect(rollbackFailure).toBeUndefined();
    expect(cancelFrame.mock.calls.filter(([frame]) => frame === visibilityFrame)).toHaveLength(3);
    prepared.dispose();
    expect(executor.read().animation).toBe(previousControls);
    executor.dispose();
    vi.unstubAllGlobals();
  });

  it('SVG prepare 在 commit 前拒绝已缺失的 entity mutation target', () => {
    const pair = createCorePair(scene('#ef4444'), scene('#22c55e'));
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const renderer = builtinRetainedRendererFactory({
      backend: 'svg',
      host,
      immutableOptions: { backend: 'svg', idPrefix: 'svg-prepare-target' },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    mount.commit();
    mount.dispose();
    host.querySelector('[data-retikz-id="node-a"]')?.remove();

    expect(() => executor.prepare(pair.patch, frameOf(pair.next), {})).toThrow('SVG update target is missing');
    executor.dispose();
  });

  it('Canvas root animation descriptor 变化只重启 root timeline，并保留未变 occurrence clock', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const alphaValues: Array<number> = [];
    const scaleCalls: Array<ReadonlyArray<number>> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const state = { canvas: this, globalAlpha: 1 };
      const alphaStack: Array<number> = [];
      return new Proxy(state as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'save') return () => alphaStack.push(target.globalAlpha);
          if (key === 'restore') return () => (target.globalAlpha = alphaStack.pop() ?? 1);
          if (key === 'scale') return (...args: Array<number>) => scaleCalls.push(args);
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && typeof value === 'number') alphaValues.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const root = createRuntimeIdentity('canvas-root-animation', ['root']);
    const identity = createRuntimeIdentity('canvas-root-animation', ['node']);
    const primitive: RuntimeScenePrimitive = {
      type: 'rect',
      id: 'node',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill: '#ef4444',
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 300,
          trigger: 'manual',
        },
      ],
    };
    const rootAnimation = (duration: number) => ({
      property: 'viewBox' as const,
      keyframes: [
        { at: 0, value: [0, 0, 100, 40] as const },
        { at: 1, value: [25, 10, 50, 20] as const },
      ],
      duration,
      trigger: 'load' as const,
    });
    const snapshot = (revision: number, duration: number): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [rootAnimation(duration)],
        primitives: [primitive],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0], publicId: 'node' }],
    });
    const current = snapshot(0, 300);
    const next = snapshot(1, 600);
    let hydrationAnimation: HydrationAnimationControls | undefined;
    const config = {
      handlerContributions: [
        {
          registration: 1,
          handlers: {
            node: {
              click: (_event: Event, context: { animation: HydrationAnimationControls }) =>
                (hydrationAnimation = context.animation),
            },
          },
        },
      ],
    } as const;
    const host = document.createElement('canvas');
    host.width = 100;
    host.height = 40;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'root-animation-test', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), config, 'create');
    mount.commit();
    mount.dispose();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
    hydrationAnimation?.restart();
    const controls = executor.read().animation;
    controls?.seek(120);
    alphaValues.length = 0;
    scaleCalls.length = 0;

    const prepared = executor.prepare(
      {
        baseRevision: current.revision,
        nextRevision: next.revision,
        operations: [{ kind: 'setAnimations', animations: next.scene.animations }],
      },
      frameOf(next),
      config,
    );
    prepared.commit();
    prepared.dispose();

    expect(executor.read().animation).toBe(controls);
    expect(alphaValues.some(value => Math.abs(value - 0.4) < 0.01)).toBe(true);
    expect(scaleCalls.at(-1)).toEqual([1, 1]);
    executor.dispose();
    vi.unstubAllGlobals();
  });

  it('SVG WAAPI binding dispose 恢复接管前的 inline transform styles', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.style.transformOrigin = '3px 4px';
    target.style.transformBox = 'fill-box';
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'rotate',
          keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'manual',
          transformOrigin: '10px 20px',
        },
      ]),
    );
    Object.defineProperty(target, 'animate', {
      value: () => ({
        pause: vi.fn(),
        play: vi.fn(),
        cancel: vi.fn(),
        currentTime: 0,
        playState: 'paused',
      }),
    });
    host.appendChild(target);

    const controls = bindWaapiDescriptors(host);
    expect(target.style.transformOrigin).toBe('10px 20px');
    expect(target.style.transformBox).toBe('view-box');
    target.setAttribute('data-retikz-anim', target.getAttribute('data-retikz-anim')!.replace('10px 20px', '30px 40px'));
    const replacementControls = bindWaapiDescriptors(host);
    expect(target.style.transformOrigin).toBe('30px 40px');
    controls.dispose();
    expect(target.style.transformOrigin).toBe('30px 40px');
    replacementControls.dispose();
    expect(target.style.transformOrigin).toBe('3px 4px');
    expect(target.style.transformBox).toBe('fill-box');

    const rollbackBase = bindWaapiDescriptors(host);
    target.setAttribute('data-retikz-anim', target.getAttribute('data-retikz-anim')!.replace('30px 40px', '50px 60px'));
    const rollbackCandidate = bindWaapiDescriptors(host);
    rollbackCandidate.dispose();
    expect(target.style.transformOrigin).toBe('30px 40px');
    rollbackBase.dispose();
    expect(target.style.transformOrigin).toBe('3px 4px');
  });

  it('SVG WAAPI binding 的 cancel 失败时仍清理 listener/style 并只重试失败 animation', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.style.transformOrigin = '3px 4px';
    target.style.transformBox = 'fill-box';
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'rotate',
          keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: { onEvent: 'click' },
          transformOrigin: '10px 20px',
        },
      ]),
    );
    let rejectCancel = true;
    const play = vi.fn();
    const cancel = vi.fn(() => {
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error('animation cancel rejected');
      }
    });
    Object.defineProperty(target, 'animate', {
      value: () => ({ pause: vi.fn(), play, cancel, currentTime: 0, playState: 'running' }),
    });
    host.appendChild(target);
    const remove = vi.spyOn(target, 'removeEventListener');
    const controls = bindWaapiDescriptors(host);
    target.dispatchEvent(new MouseEvent('click'));

    expect(() => controls.dispose()).toThrow('animation cancel rejected');
    expect(target.style.transformOrigin).toBe('3px 4px');
    expect(target.style.transformBox).toBe('fill-box');
    target.dispatchEvent(new MouseEvent('click'));
    expect(play).not.toHaveBeenCalled();

    expect(() => controls.dispose()).not.toThrow();
    expect(() => controls.dispose()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(remove.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
  });

  it('SVG event animation cancel 同步触发 dispose 后不再重新 play', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: { onEvent: 'click' },
        },
      ]),
    );
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const play = vi.fn();
    const cancel = vi.fn(() => controlsRef.current?.dispose());
    Object.defineProperty(target, 'animate', {
      value: () => ({ pause: vi.fn(), play, cancel, currentTime: 0, playState: 'running' }),
    });
    host.appendChild(target);
    const remove = vi.spyOn(target, 'removeEventListener');
    const controls = bindWaapiDescriptors(host);
    controlsRef.current = controls;
    target.dispatchEvent(new MouseEvent('click'));

    target.dispatchEvent(new MouseEvent('click'));

    expect(play).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(controls.running).toBe(false);
    expect(remove.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
    expect(() => controls.dispose()).not.toThrow();
  });

  it.each(['visible', 'event'] as const)('SVG %s 首次 animate 同步 dispose 后立即清理返回的 animation', triggerKind => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: triggerKind === 'visible' ? 'visible' : { onEvent: 'click' },
        },
      ]),
    );
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const cancel = vi.fn();
    Object.defineProperty(target, 'animate', {
      value: () => {
        controlsRef.current?.dispose();
        return { pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'running' };
      },
    });
    let observeVisibility: ((entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) | undefined;
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) {
        observeVisibility = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    try {
      host.appendChild(target);
      const controls = bindWaapiDescriptors(host);
      controlsRef.current = controls;

      if (triggerKind === 'visible') observeVisibility?.([{ isIntersecting: true }]);
      else target.dispatchEvent(new MouseEvent('click'));

      expect(cancel).toHaveBeenCalledTimes(1);
      expect(controls.running).toBe(false);
      expect(() => controls.dispose()).not.toThrow();
      expect(cancel).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(['visible', 'event'] as const)('SVG %s gate 读取同步 dispose 后不再调用外部 animation', triggerKind => {
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: triggerKind === 'visible' ? 'visible' : { onEvent: 'click' },
        },
      ]),
    );
    const animate = vi.fn(() => ({
      pause: vi.fn(),
      play: vi.fn(),
      cancel: vi.fn(),
      currentTime: 0,
      playState: 'running',
    }));
    Object.defineProperty(target, 'animate', { value: animate });
    let observeVisibility: ((entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) | undefined;
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) {
        observeVisibility = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    let reenterOnGateRead = false;
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const controls = bindWaapiDescriptorElements([target], () => {
      if (reenterOnGateRead) {
        reenterOnGateRead = false;
        controlsRef.current?.dispose();
      }
      return true;
    });
    controlsRef.current = controls;
    reenterOnGateRead = true;
    try {
      if (triggerKind === 'visible') observeVisibility?.([{ isIntersecting: true }]);
      else target.dispatchEvent(new MouseEvent('click'));

      expect(animate).not.toHaveBeenCalled();
      expect(controls.running).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('SVG binding play 中首个 animation 同步 dispose 后不再播放后续 animation', () => {
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify(
        [100, 200].map(duration => ({
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'manual',
        })),
      ),
    );
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const secondPlay = vi.fn();
    let animationIndex = 0;
    Object.defineProperty(target, 'animate', {
      value: () => {
        const index = animationIndex++;
        return {
          pause: vi.fn(),
          play: index === 0 ? vi.fn(() => controlsRef.current?.dispose()) : secondPlay,
          cancel: vi.fn(),
          currentTime: 0,
          playState: 'paused',
        };
      },
    });
    const controls = bindWaapiDescriptors(target);
    controlsRef.current = controls;

    controls.play();

    expect(secondPlay).not.toHaveBeenCalled();
    expect(controls.running).toBe(false);
  });

  it('SVG visible observer 注册中同步消费 trigger 后不遗留 observer', () => {
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'visible',
        },
      ]),
    );
    Object.defineProperty(target, 'animate', {
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'running' }),
    });
    let observerRegistered = false;
    const disconnect = vi.fn(() => {
      observerRegistered = false;
    });
    class TestIntersectionObserver {
      private readonly callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void;

      constructor(callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) {
        this.callback = callback;
      }

      observe = vi.fn(() => {
        this.callback([{ isIntersecting: true }]);
        observerRegistered = true;
      });

      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    try {
      const controls = bindWaapiDescriptors(target);

      expect(observerRegistered).toBe(false);
      expect(disconnect).toHaveBeenCalledTimes(2);
      controls.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('SVG event listener 安装后注册抛错仍由 setup cleanup 移除', () => {
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: { onEvent: 'click' },
        },
      ]),
    );
    const animate = vi.fn(() => ({
      pause: vi.fn(),
      play: vi.fn(),
      cancel: vi.fn(),
      currentTime: 0,
      playState: 'running',
    }));
    Object.defineProperty(target, 'animate', { value: animate });
    const addEventListener = target.addEventListener.bind(target);
    const removeEventListener = target.removeEventListener.bind(target);
    const removeEventListenerSpy = vi
      .spyOn(target, 'removeEventListener')
      .mockImplementation((type, listener, options) => removeEventListener(type, listener, options));
    vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
      addEventListener(type, listener, options);
      throw new Error('listener registration rejected');
    });

    expect(() => bindWaapiDescriptors(target)).toThrow('listener registration rejected');
    target.dispatchEvent(new MouseEvent('click'));

    expect(animate).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
  });

  it('SVG visible observer 触发成功后 final dispose 不重复 disconnect', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'visible',
        },
      ]),
    );
    Object.defineProperty(target, 'animate', {
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'running' }),
    });
    const disconnect = vi.fn();
    let observeVisibility: ((entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) | undefined;
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) {
        observeVisibility = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    try {
      host.appendChild(target);
      const controls = bindWaapiDescriptors(host);
      observeVisibility?.([{ isIntersecting: true }]);
      controls.dispose();
      controls.dispose();
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('SVG visible observer disconnect 重入或失败时只消费一次 trigger', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'visible',
        },
      ]),
    );
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'running' }));
    Object.defineProperty(target, 'animate', { value: animate });
    let observeVisibility: ((entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) | undefined;
    let reentered = false;
    const disconnect = vi.fn(() => {
      if (reentered) return;
      reentered = true;
      observeVisibility?.([{ isIntersecting: true }]);
      throw new Error('observer disconnect rejected');
    });
    class TestIntersectionObserver {
      constructor(callback: (entries: Array<Readonly<{ isIntersecting: boolean }>>) => void) {
        observeVisibility = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    try {
      host.appendChild(target);
      const controls = bindWaapiDescriptors(host);

      expect(() => observeVisibility?.([{ isIntersecting: true }])).toThrow('observer disconnect rejected');
      expect(() => observeVisibility?.([{ isIntersecting: true }])).not.toThrow();
      expect(animate).toHaveBeenCalledTimes(1);
      expect(() => controls.dispose()).not.toThrow();
      expect(disconnect).toHaveBeenCalledTimes(2);
      expect(cancel).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('SVG WAAPI binding 构建与 cleanup 同时失败时保留 setup primary 与重试 controls', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const descriptor = JSON.stringify([
      {
        property: 'rotate',
        keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
        timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
        trigger: 'manual',
      },
    ]);
    const first = document.createElementNS(SVG_NAMESPACE, 'g');
    const second = document.createElementNS(SVG_NAMESPACE, 'g');
    first.setAttribute('data-retikz-anim', descriptor);
    second.setAttribute('data-retikz-anim', descriptor);
    let rejectCancel = true;
    const cancel = vi.fn(() => {
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error('setup cleanup rejected');
      }
    });
    Object.defineProperty(first, 'animate', {
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'paused' }),
    });
    Object.defineProperty(second, 'animate', {
      value: () => {
        throw new Error('binding setup rejected');
      },
    });
    host.append(first, second);

    let failure: unknown;
    try {
      bindWaapiDescriptors(host);
    } catch (cause) {
      failure = cause;
    }
    expect(failure).toMatchObject({
      name: 'RetikzRenderError',
      code: RetikzRenderErrorCode.WaapiBindingSetupFailed,
      cause: expect.objectContaining({ message: 'binding setup rejected' }),
      details: expect.objectContaining({
        cleanupCause: expect.objectContaining({ message: 'setup cleanup rejected' }),
      }),
    });
    if (!(failure instanceof RetikzRenderError)) throw new Error('expected WAAPI setup error');
    const controls = failure.details.controls as Readonly<{ dispose: () => void }>;
    expect(() => controls.dispose()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('SVG manual animation 在 pause 前进入 pending 并支持 setup cleanup 重试', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'manual',
        },
      ]),
    );
    let rejectCancel = true;
    const cancel = vi.fn(() => {
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error('pause cleanup rejected');
      }
    });
    Object.defineProperty(target, 'animate', {
      value: () => ({
        pause: () => {
          throw new Error('manual pause rejected');
        },
        play: vi.fn(),
        cancel,
        currentTime: 0,
        playState: 'paused',
      }),
    });
    host.appendChild(target);

    let failure: unknown;
    try {
      bindWaapiDescriptors(host);
    } catch (cause) {
      failure = cause;
    }
    expect(failure).toMatchObject({
      name: 'RetikzRenderError',
      code: RetikzRenderErrorCode.WaapiBindingSetupFailed,
      cause: expect.objectContaining({ message: 'manual pause rejected' }),
      details: expect.objectContaining({
        cleanupCause: expect.objectContaining({ message: 'pause cleanup rejected' }),
      }),
    });
    if (!(failure instanceof RetikzRenderError)) throw new Error('expected WAAPI setup error');
    const controls = failure.details.controls as Readonly<{ dispose: () => void }>;
    expect(() => controls.dispose()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('SVG raw binding dispose 同步重入时不重复 cancel', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const target = document.createElementNS(SVG_NAMESPACE, 'g');
    target.setAttribute(
      'data-retikz-anim',
      JSON.stringify([
        {
          property: 'opacity',
          keyframes: [{ opacity: 0 }, { opacity: 1 }],
          timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
          trigger: 'manual',
        },
      ]),
    );
    const controlsRef: { current?: Readonly<{ dispose: () => void }> } = {};
    const cancel = vi.fn(() => controlsRef.current?.dispose());
    Object.defineProperty(target, 'animate', {
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'paused' }),
    });
    host.appendChild(target);
    const controls = bindWaapiDescriptors(host);
    controlsRef.current = controls;

    expect(() => controls.dispose()).not.toThrow();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('SVG WAAPI binding 中途失败会清理已创建 animation 与 style ownership', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const descriptor = JSON.stringify([
      {
        property: 'rotate',
        keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
        timing: { duration: 100, delay: 0, easing: 'linear', iterations: 1, fill: 'both' },
        trigger: 'manual',
        transformOrigin: '10px 20px',
      },
    ]);
    const first = document.createElementNS(SVG_NAMESPACE, 'g');
    const second = document.createElementNS(SVG_NAMESPACE, 'g');
    first.style.transformOrigin = '1px 2px';
    first.setAttribute('data-retikz-anim', descriptor);
    second.setAttribute('data-retikz-anim', descriptor);
    const cancel = vi.fn();
    Object.defineProperty(first, 'animate', {
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'paused' }),
    });
    Object.defineProperty(second, 'animate', {
      value: () => {
        throw new Error('second animate failed');
      },
    });
    host.append(first, second);

    expect(() => bindWaapiDescriptors(host)).toThrow('second animate failed');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(first.style.transformOrigin).toBe('1px 2px');
  });

  it('SVG 按 RuntimeIdentity 保留未变 WAAPI binding，并在 change/remove/replace 后释放旧 binding', () => {
    const root = createRuntimeIdentity('svg-animation', ['root']);
    const identities = ['node-a', 'node-b'].map(id => createRuntimeIdentity('svg-animation', [id]));
    const primitive = (id: string, index: number, duration: number): RuntimeScenePrimitive => ({
      type: 'rect',
      id,
      x: index * 40,
      y: 0,
      width: 20,
      height: 20,
      fill: '#ef4444',
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
          trigger: 'manual',
        },
      ],
    });
    const snapshot = (revision: number, primitives: ReadonlyArray<RuntimeScenePrimitive>): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives,
      },
      topology: primitives.map((item, index) => ({
        identity: identities[index],
        semanticOwner: identities[index],
        parent: root,
        order: index,
        primitivePath: [index],
        publicId: item.id,
      })),
    });
    const currentPrimitives = [primitive('node-a', 0, 200), primitive('node-b', 1, 300)];
    const changedPrimitives = [currentPrimitives[0], primitive('node-b', 1, 600)];
    const current = snapshot(0, currentPrimitives);
    const changed = snapshot(2, changedPrimitives);
    const removed = snapshot(3, [changedPrimitives[0]]);
    const replaced = snapshot(4, [changedPrimitives[0]]);
    const records: Array<Readonly<{ duration: number; cancel: ReturnType<typeof vi.fn> }>> = [];
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: (_keyframes: unknown, timing: KeyframeAnimationOptions) => {
        const cancel = vi.fn();
        records.push({ duration: Number(timing.duration), cancel });
        return { pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'paused' };
      },
    });
    try {
      const host = document.createElementNS(SVG_NAMESPACE, 'svg');
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-test' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(current), {}, 'create');
      mount.commit();
      mount.dispose();
      const aggregate = executor.read().animation;
      const stable = records.find(record => record.duration === 200);
      const changedOld = records.find(record => record.duration === 300);
      expect(stable).toBeDefined();
      expect(changedOld).toBeDefined();

      const stableSnapshot = { ...current, revision: 1 as SceneRuntimeSnapshot['revision'] };
      const stablePatch: ScenePatch = {
        baseRevision: current.revision,
        nextRevision: stableSnapshot.revision,
        operations: [],
      };
      const preparedStable = executor.prepare(stablePatch, frameOf(stableSnapshot), {});
      preparedStable.commit();
      preparedStable.dispose();
      expect(executor.read().animation).toBe(aggregate);

      const update: ScenePatch = {
        baseRevision: stableSnapshot.revision,
        nextRevision: changed.revision,
        operations: [
          {
            kind: 'update',
            identity: identities[1],
            subtree: {
              root: identities[1],
              primitive: changedPrimitives[1],
              topology: [
                {
                  identity: identities[1],
                  semanticOwner: identities[1],
                  order: 0,
                  primitivePath: [],
                  publicId: 'node-b',
                },
              ],
            },
          },
        ],
      };
      const preparedUpdate = executor.prepare(update, frameOf(changed), {});
      preparedUpdate.commit();
      expect(records.map(record => record.duration)).toEqual([200, 300, 600]);
      expect(changedOld?.cancel).not.toHaveBeenCalled();
      preparedUpdate.dispose();
      expect(changedOld?.cancel).toHaveBeenCalledTimes(1);
      expect(stable?.cancel).not.toHaveBeenCalled();

      const remove: ScenePatch = {
        baseRevision: changed.revision,
        nextRevision: removed.revision,
        operations: [{ kind: 'remove', identity: identities[1] }],
      };
      const preparedRemove = executor.prepare(remove, frameOf(removed), {});
      preparedRemove.commit();
      preparedRemove.dispose();
      expect(records.find(record => record.duration === 600)?.cancel).toHaveBeenCalledTimes(1);
      expect(stable?.cancel).not.toHaveBeenCalled();

      const replace: ScenePatch = {
        baseRevision: removed.revision,
        nextRevision: replaced.revision,
        operations: [{ kind: 'replaceScene', snapshot: replaced }],
      };
      const preparedReplace = executor.prepare(replace, frameOf(replaced), {});
      preparedReplace.commit();
      preparedReplace.dispose();
      expect(records.map(record => record.duration)).toEqual([200, 300, 600, 200]);
      expect(stable?.cancel).toHaveBeenCalledTimes(1);
      executor.dispose();
      expect(records.at(-1)?.cancel).toHaveBeenCalledTimes(1);
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG 同 identity primitive 换元素类型时把未变动画 descriptor 重新绑定到新元素', () => {
    const root = createRuntimeIdentity('svg-animation-element', ['root']);
    const identity = createRuntimeIdentity('svg-animation-element', ['node']);
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 300,
      trigger: 'manual' as const,
    };
    const currentPrimitive: RuntimeScenePrimitive = {
      type: 'rect',
      id: 'node',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      animations: [animation],
    };
    const nextPrimitive: RuntimeScenePrimitive = {
      type: 'path',
      id: 'node',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [20, 20] },
      ],
      animations: [animation],
    };
    const snapshot = (revision: number, primitive: RuntimeScenePrimitive): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 40, height: 40 },
        resources: [],
        animations: [],
        primitives: [primitive],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0], publicId: 'node' }],
    });
    const current = snapshot(0, currentPrimitive);
    const next = snapshot(1, nextPrimitive);
    const animatedElements: Array<SVGElement> = [];
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value(this: SVGElement) {
        animatedElements.push(this);
        return { pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'paused' };
      },
    });
    try {
      const host = document.createElementNS(SVG_NAMESPACE, 'svg');
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-element' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(current), {}, 'create');
      mount.commit();
      mount.dispose();
      const prepared = executor.prepare(
        {
          baseRevision: current.revision,
          nextRevision: next.revision,
          operations: [
            {
              kind: 'update',
              identity,
              subtree: {
                root: identity,
                primitive: nextPrimitive,
                topology: [{ identity, semanticOwner: identity, order: 0, primitivePath: [], publicId: 'node' }],
              },
            },
          ],
        },
        frameOf(next),
        {},
      );
      prepared.commit();
      prepared.dispose();

      expect(animatedElements.map(element => element.localName)).toEqual(['rect', 'path']);
      executor.dispose();
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG commit 后、prepared dispose 前旧 onEvent binding 已失效，rollback 可恢复', () => {
    const current = animatedScene('#ef4444', { onEvent: 'click' });
    const pair = createCorePair(current, scene('#22c55e'));
    const next = { ...pair.current, revision: 1 as SceneRuntimeSnapshot['revision'] };
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const play = vi.fn();
    const animate = vi.fn(() => ({
      pause: vi.fn(),
      play,
      cancel: vi.fn(),
      currentTime: 0,
      playState: 'running',
    }));
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', { configurable: true, value: animate });
    try {
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-retire' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
      mount.commit();
      mount.dispose();
      const target = host.querySelector('[data-retikz-id="node-a"]');
      if (!(target instanceof SVGElement)) throw new Error('expected animated SVG target');
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(animate).toHaveBeenCalledTimes(1);

      const prepared = executor.prepare(
        { baseRevision: pair.current.revision, nextRevision: next.revision, operations: [] },
        frameOf(next),
        { animation: { enabled: false } },
      );
      prepared.commit();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(animate).toHaveBeenCalledTimes(1);
      expect(play).not.toHaveBeenCalled();

      prepared.rollback();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(animate).toHaveBeenCalledTimes(1);
      expect(play).toHaveBeenCalledTimes(2);
      prepared.dispose();
      executor.dispose();
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG retired WAAPI suspension 抛错后 rollback 恢复旧 binding gate', () => {
    const pair = createCorePair(animatedScene('#ef4444', { onEvent: 'click' }), scene('#22c55e'));
    const next = { ...pair.current, revision: 1 as SceneRuntimeSnapshot['revision'] };
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    let rejectPause = false;
    const play = vi.fn();
    const pause = vi.fn(() => {
      if (rejectPause) throw new Error('pause rejected');
    });
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: () => ({ pause, play, cancel: vi.fn(), currentTime: 0, playState: 'running' }),
    });
    try {
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-pause-rollback' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
      mount.commit();
      mount.dispose();
      const target = host.querySelector('[data-retikz-id="node-a"]');
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      rejectPause = true;
      const prepared = executor.prepare(
        { baseRevision: pair.current.revision, nextRevision: next.revision, operations: [] },
        frameOf(next),
        { animation: { enabled: false } },
      );
      expect(() => prepared.commit()).toThrow('pause rejected');
      rejectPause = false;
      prepared.rollback();
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(play).toHaveBeenCalledTimes(2);
      prepared.dispose();
      executor.dispose();
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('renderer dispose 后旧 SVG 与 Canvas AnimationControls 不再修改 host', () => {
    const svgPair = createCorePair(animatedScene('#ef4444', 'manual'), animatedScene('#22c55e', 'manual'));
    const svgHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const svgPlay = vi.fn();
    const svgPause = vi.fn();
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: () => ({ pause: svgPause, play: svgPlay, cancel: vi.fn(), currentTime: 0, playState: 'paused' }),
    });
    try {
      const svgRenderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host: svgHost,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-stale-controls' },
      });
      const svgExecutor = getRetainedRendererExecutor(svgRenderer);
      if (svgExecutor === undefined) throw new Error('expected builtin SVG renderer executor');
      const svgMount = svgExecutor.prepareMount(frameOf(svgPair.current), {}, 'create');
      svgMount.commit();
      svgMount.dispose();
      const svgControls = svgExecutor.read().animation;
      svgPause.mockClear();
      svgExecutor.dispose();
      svgControls?.play();
      svgControls?.pause();
      svgControls?.seek(150);
      expect(svgPlay).not.toHaveBeenCalled();
      expect(svgPause).not.toHaveBeenCalled();
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }

    const canvasPair = createCorePair(animatedScene('#ef4444', 'manual'), animatedScene('#22c55e', 'manual'));
    const canvasHost = document.createElement('canvas');
    canvasHost.width = 200;
    canvasHost.height = 100;
    document.body.appendChild(canvasHost);
    const connectedClears = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'clearRect' && this.isConnected) return connectedClears;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const canvasRenderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host: canvasHost,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-stale-controls', devicePixelRatio: 1 },
    });
    const canvasExecutor = getRetainedRendererExecutor(canvasRenderer);
    if (canvasExecutor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const canvasMount = canvasExecutor.prepareMount(frameOf(canvasPair.current), {}, 'create');
    canvasMount.commit();
    canvasMount.dispose();
    const canvasControls = canvasExecutor.read().animation;
    const nextCanvasSnapshot = {
      ...canvasPair.current,
      revision: 1 as SceneRuntimeSnapshot['revision'],
    };
    const retired = canvasExecutor.prepare(
      {
        baseRevision: canvasPair.current.revision,
        nextRevision: nextCanvasSnapshot.revision,
        operations: [],
      },
      frameOf(nextCanvasSnapshot),
      { animation: { enabled: false } },
    );
    retired.commit();
    connectedClears.mockClear();
    canvasControls?.seek(100);
    expect(connectedClears).not.toHaveBeenCalled();
    retired.rollback();
    connectedClears.mockClear();
    canvasControls?.seek(100);
    expect(connectedClears).toHaveBeenCalled();
    retired.dispose();
    canvasExecutor.dispose();
    connectedClears.mockClear();
    canvasControls?.seek(150);
    canvasControls?.play();
    expect(connectedClears).not.toHaveBeenCalled();
  });

  it('Canvas visibility listener 注册中途失败时清理已注册 listener', () => {
    const pair = createCorePair(animatedScene('#ef4444', 'visible'), animatedScene('#22c55e', 'visible'));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key in target ? Reflect.get(target, key) : vi.fn()),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const originalAdd = window.addEventListener.bind(window);
    const add = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'resize') throw new Error('resize listener rejected');
      originalAdd(type, listener, options);
    });
    const remove = vi.spyOn(window, 'removeEventListener');
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visibility-cleanup', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    expect(() => mount.commit()).toThrow('resize listener rejected');
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    mount.rollback();
    mount.dispose();
    executor.dispose();
  });

  it('SVG full reconcile 保留未变 WAAPI binding 接管的 transform styles', () => {
    const root = createRuntimeIdentity('svg-animation-style', ['root']);
    const identity = createRuntimeIdentity('svg-animation-style', ['node']);
    const primitive: RuntimeScenePrimitive = {
      type: 'rect',
      id: 'node',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill: '#ef4444',
      animations: [
        {
          property: 'rotate',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 90 },
          ],
          duration: 300,
          trigger: 'manual',
          origin: 'bottom',
        },
      ],
    };
    const snapshot = (revision: number, width: number): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width, height: 40 },
        resources: [],
        animations: [],
        primitives: [primitive],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0], publicId: 'node' }],
    });
    const current = snapshot(0, 100);
    const next = snapshot(1, 120);
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: () => ({ pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'paused' }),
    });
    try {
      const host = document.createElementNS(SVG_NAMESPACE, 'svg');
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-style' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(current), {}, 'create');
      mount.commit();
      mount.dispose();
      const element = host.querySelector('[data-retikz-anim]');
      if (!(element instanceof SVGElement)) throw new Error('expected animated SVG element');
      const controls = executor.read().animation;
      const transformOrigin = element.style.transformOrigin;
      expect(transformOrigin).not.toBe('');
      expect(element.style.transformBox).toBe('view-box');
      expect(isWaapiAnimationStyleOwned(element, 'transform-origin')).toBe(true);

      const prepared = executor.prepare(
        {
          baseRevision: current.revision,
          nextRevision: next.revision,
          operations: [{ kind: 'setLayout', layout: next.scene.layout }],
        },
        frameOf(next),
        {},
      );
      prepared.commit();
      prepared.dispose();

      expect(host.querySelector('[data-retikz-anim]')).toBe(element);
      expect(executor.read().animation).toBe(controls);
      expect(isWaapiAnimationStyleOwned(element, 'transform-origin')).toBe(true);
      expect(element.style.transformOrigin).toBe(transformOrigin);
      expect(element.style.transformBox).toBe('view-box');
      executor.dispose();
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG animation binding 分组创建中途失败会释放先前已创建 controls', () => {
    const root = createRuntimeIdentity('svg-animation-failure', ['root']);
    const identities = ['a', 'b'].map(id => createRuntimeIdentity('svg-animation-failure', [id]));
    const primitives: ReadonlyArray<RuntimeScenePrimitive> = [200, 300].map((duration, index) => ({
      type: 'rect',
      id: `node-${index}`,
      x: index * 30,
      y: 0,
      width: 20,
      height: 20,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
          trigger: 'manual',
        },
      ],
    }));
    const snapshot: SceneRuntimeSnapshot = {
      revision: 0 as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives,
      },
      topology: primitives.map((primitive, index) => ({
        identity: identities[index],
        semanticOwner: identities[index],
        parent: root,
        order: index,
        primitivePath: [index],
        publicId: primitive.id,
      })),
    };
    let rejectCancel = true;
    const cancel = vi.fn(() => {
      if (rejectCancel) {
        rejectCancel = false;
        throw new Error('created controls cleanup rejected');
      }
    });
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: (_keyframes: unknown, timing: KeyframeAnimationOptions) => {
        if (Number(timing.duration) === 300) throw new Error('second occurrence failed');
        return { pause: vi.fn(), play: vi.fn(), cancel, currentTime: 0, playState: 'paused' };
      },
    });
    try {
      const host = document.createElementNS(SVG_NAMESPACE, 'svg');
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-failure' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      expect(() => mount.commit()).toThrow('second occurrence failed');
      mount.rollback();
      mount.dispose();
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(() => executor.dispose()).not.toThrow();
      expect(cancel).toHaveBeenCalledTimes(2);
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG aggregate cleanup 同步重入时先让全部 child controls 失活', () => {
    const animated: IRScene = {
      version: 1,
      type: 'scene',
      children: ['node-a', 'node-b'].map((id, index) => ({
        type: 'node' as const,
        id,
        position: [index * 40, 0] as const,
        animations: [
          {
            property: 'opacity' as const,
            keyframes: [
              { at: 0, value: 0 },
              { at: 1, value: 1 },
            ],
            duration: 300,
            trigger: index === 0 ? ('manual' as const) : ({ onEvent: 'click' } as const),
          },
        ],
      })),
    };
    const snapshot = createCorePair(scene('#ef4444'), animated).next;
    let animationIndex = 0;
    let host: SVGSVGElement | undefined;
    const previousAnimate = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'animate');
    const animate = vi.fn(() => {
      const index = animationIndex++;
      return {
        pause: vi.fn(),
        play: vi.fn(),
        cancel: vi.fn(() => {
          if (index === 0) host?.querySelector('[data-retikz-id="node-b"]')?.dispatchEvent(new MouseEvent('click'));
        }),
        currentTime: 0,
        playState: 'paused',
      };
    });
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: animate,
    });
    try {
      host = document.createElementNS(SVG_NAMESPACE, 'svg');
      const renderer = builtinRetainedRendererFactory({
        backend: 'svg',
        host,
        immutableOptions: { backend: 'svg', idPrefix: 'svg-animation-reentry' },
      });
      const executor = getRetainedRendererExecutor(renderer);
      if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
      const mount = executor.prepareMount(frameOf(snapshot), {}, 'create');
      mount.commit();
      mount.dispose();

      executor.dispose();
      expect(animate).toHaveBeenCalledTimes(1);
    } finally {
      if (previousAnimate === undefined) delete (SVGElement.prototype as { animate?: unknown }).animate;
      else Object.defineProperty(SVGElement.prototype, 'animate', previousAnimate);
    }
  });

  it('SVG update 与 move 保留稳定 public node identity', () => {
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { handle, session } = createSession('svg', host);
    const nodeA = host.querySelector('[data-retikz-id="node-a"]');
    const nodeB = host.querySelector('[data-retikz-id="node-b"]');
    expect(nodeA).not.toBeNull();
    expect(nodeB).not.toBeNull();

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
    });
    expect(host.querySelector('[data-retikz-id="node-a"]')).toBe(nodeA);

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e', true))],
    });
    expect(host.querySelector('[data-retikz-id="node-a"]')).toBe(nodeA);
    expect(host.querySelector('[data-retikz-id="node-b"]')).toBe(nodeB);
    expect(handle.read(session).frame.primary.revision).toBe(2);

    session.dispose();
    expect(() => handle.read(session)).toThrow();
  });

  it('SVG duplicate public id 的 full/resource reconcile 仍按 RuntimeIdentity 保留 occurrence node', () => {
    const sourceScene = (reversed: boolean, gradient: boolean, rootAnimated = false): IRScene => {
      const children: IRScene['children'] = [
        {
          type: 'node',
          id: 'node-a',
          position: [0, 0],
          text: 'A',
          fill: gradient ? { kind: 'linearGradient', angle: 0, stops: [{ offset: 0, color: '#ef4444' }] } : '#ef4444',
        },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B', fill: '#3b82f6' },
      ];
      return {
        version: 1,
        type: 'scene',
        children: reversed ? [...children].reverse() : children,
        ...(rootAnimated
          ? {
              animations: [
                {
                  property: 'viewBox' as const,
                  keyframes: [
                    { at: 0, value: [0, 0, 100, 100] },
                    { at: 1, value: [5, 5, 90, 90] },
                  ],
                  duration: 300,
                },
              ],
            }
          : {}),
      };
    };
    const duplicatePrimitiveIds = (primitive: RuntimeScenePrimitive): RuntimeScenePrimitive =>
      Object.freeze({
        ...primitive,
        ...(primitive.id === undefined ? {} : { id: 'duplicate' }),
        ...(primitive.type === 'group'
          ? { children: Object.freeze(primitive.children.map(duplicatePrimitiveIds)) }
          : {}),
      });
    const duplicatePublicIds = (snapshot: SceneRuntimeSnapshot): SceneRuntimeSnapshot =>
      Object.freeze({
        ...snapshot,
        scene: Object.freeze({
          ...snapshot.scene,
          primitives: Object.freeze(snapshot.scene.primitives.map(duplicatePrimitiveIds)),
        }),
        topology: Object.freeze(
          snapshot.topology.map(node =>
            Object.freeze({ ...node, ...(node.publicId === undefined ? {} : { publicId: 'duplicate' }) }),
          ),
        ),
      });

    const seedHost = document.createElementNS(SVG_NAMESPACE, 'svg');
    const seed = createSession('svg', seedHost, { ir: sourceScene(false, false) });
    const current = duplicatePublicIds(seed.handle.read(seed.session).frame.primary);
    seed.session.update({
      baseRevision: seed.session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sourceScene(true, true, true))],
    });
    const next = duplicatePublicIds(seed.handle.read(seed.session).frame.primary);
    seed.session.dispose();

    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const renderer = builtinRetainedRendererFactory({
      backend: 'svg',
      host,
      immutableOptions: { backend: 'svg', idPrefix: 'duplicate-test' },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin SVG renderer executor');
    const pointerEnter = vi.fn();
    const pointerLeave = vi.fn();
    const runtimeConfig = {
      handlerContributions: [
        {
          registration: 1,
          handlers: { duplicate: { pointerEnter, pointerLeave } },
        },
      ],
    } as const;
    const mount = executor.prepareMount(frameOf(current), runtimeConfig, 'create');
    mount.commit();
    mount.dispose();
    const occurrences = Array.from(host.querySelectorAll('[data-retikz-id="duplicate"]'));
    const nodeA = occurrences.find(element => element.textContent === 'A');
    const nodeB = occurrences.find(element => element.textContent === 'B');
    expect(nodeA).toBeDefined();
    expect(nodeB).toBeDefined();
    nodeA?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    nodeB?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }));
    expect(pointerEnter).toHaveBeenCalledTimes(2);
    expect(pointerLeave).toHaveBeenCalledTimes(1);

    const replacePatch: ScenePatch = Object.freeze({
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: Object.freeze([Object.freeze({ kind: 'replaceScene', snapshot: next })]),
    });
    const prepared = executor.prepare(replacePatch, frameOf(next), runtimeConfig);
    prepared.commit();
    prepared.dispose();
    const nextOccurrences = Array.from(host.querySelectorAll('[data-retikz-id="duplicate"]'));
    expect(nextOccurrences.find(element => element.textContent === 'A')).toBe(nodeA);
    expect(nextOccurrences.find(element => element.textContent === 'B')).toBe(nodeB);
    expect(nextOccurrences[0]).toBe(nodeB);
    executor.dispose();
  });

  it('Canvas commit 通过 offscreen bitmap 一次交换并推进 snapshot', () => {
    const drawImage = vi.fn();
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const existing = contexts.get(this);
      if (existing !== undefined) return existing;
      const functions = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
      const context = new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          const callback = functions.get(key) ?? vi.fn();
          functions.set(key, callback);
          return callback;
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
      contexts.set(this, context);
      return context;
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host);
    expect(drawImage).toHaveBeenCalledTimes(1);

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
    });

    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(handle.read(session).frame.primary.revision).toBe(1);
    session.dispose();
  });

  it('Canvas handler-only config transaction 复用 committed bitmap', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host);
    const previousRead = handle.read(session);
    expect(drawImage).toHaveBeenCalledTimes(1);

    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          handlerContributions: [{ registration: 0, handlers: {} }],
        }),
      ],
    });

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(handle.read(session)).not.toBe(previousRead);
    expect(handle.read(session).frame.primary.revision).toBe(1);
    session.dispose();
  });

  it('Canvas offscreen full render 继承 host currentColor 与 defaultFontFamily', () => {
    let computedStyle = {
      color: 'rgb(1, 2, 3)',
      fontFamily: 'Retikz Test',
    } as CSSStyleDeclaration;
    vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(() => computedStyle);
    const strokeStyles: Array<unknown> = [];
    const fonts: Array<unknown> = [];
    const frames: Array<FrameRequestCallback> = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'strokeStyle') strokeStyles.push(value);
          if (key === 'font') fonts.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host, { ir: animatedScene('currentColor', 'manual') });
    expect(strokeStyles).toContain('rgb(1, 2, 3)');
    expect(fonts.some(font => String(font).includes('Retikz Test'))).toBe(true);
    strokeStyles.length = 0;
    fonts.length = 0;
    handle.read(session).animation?.play();
    frames.at(-1)?.(0);
    expect(strokeStyles).toContain('rgb(1, 2, 3)');
    expect(fonts.some(font => String(font).includes('Retikz Test'))).toBe(true);
    computedStyle = { color: 'rgb(4, 5, 6)', fontFamily: 'Retikz Changed' } as CSSStyleDeclaration;
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, { cachePolicy: 'static' })],
    });
    expect(strokeStyles).toContain('rgb(4, 5, 6)');
    expect(fonts.some(font => String(font).includes('Retikz Changed'))).toBe(true);
    session.dispose();
  });

  it('Canvas display list 按 primitivePath 建索引，不依赖 topology 数组顺序', () => {
    const pair = createCorePair(scene('#ef4444'), scene('#22c55e'));
    expect(pair.patch.operations.every(operation => operation.kind === 'update')).toBe(true);
    const reverseTopology = (snapshot: SceneRuntimeSnapshot): SceneRuntimeSnapshot =>
      Object.freeze({ ...snapshot, topology: Object.freeze([...snapshot.topology].reverse()) });
    const fillStyles: Array<unknown> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'fillStyle') fillStyles.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'topology-order', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(reverseTopology(pair.current)), {}, 'create');
    mount.commit();
    mount.dispose();
    fillStyles.length = 0;
    const prepared = executor.prepare(pair.patch, frameOf(reverseTopology(pair.next)), {});
    prepared.commit();
    prepared.dispose();
    expect(fillStyles).toContain('#22c55e');
    expect(fillStyles).not.toContain('#3b82f6');
    executor.dispose();
  });

  it('Canvas dirty update 会在 clip 内重放覆盖受影响区域的稳定上层 subtree', () => {
    const overlapScene = (fill: string): IRScene => ({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'bottom', position: [40, 40], text: 'bottom', fill },
        { type: 'node', id: 'top', position: [40, 40], text: 'top', fill: '#3b82f6' },
      ],
    });
    const pair = createCorePair(overlapScene('#ef4444'), overlapScene('#22c55e'));
    expect(pair.patch.operations.every(operation => operation.kind === 'update')).toBe(true);
    const fillStyles: Array<unknown> = [];
    const clip = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'clip') return clip;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'fillStyle') fillStyles.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'dirty-overlap', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    mount.commit();
    mount.dispose();
    fillStyles.length = 0;
    const prepared = executor.prepare(pair.patch, frameOf(pair.next), {});
    prepared.commit();
    prepared.dispose();
    expect(clip).toHaveBeenCalled();
    expect(fillStyles).toContain('#22c55e');
    expect(fillStyles).toContain('#3b82f6');
    executor.dispose();
  });

  it('Canvas entity update 只复制 dirty region，不做全画布 drawImage', () => {
    const simpleScene = (fill: string): IRScene => ({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'changed', position: [20, 20], width: 10, height: 10, fill },
        { type: 'node', id: 'stable', position: [80, 20], width: 10, height: 10, fill: '#3b82f6' },
      ],
    });
    const pair = createCorePair(simpleScene('#ef4444'), simpleScene('#22c55e'));
    const drawImageCalls: Array<Readonly<{ target: HTMLCanvasElement; arguments: ReadonlyArray<unknown> }>> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') {
            return (...arguments_: Array<unknown>) =>
              drawImageCalls.push(Object.freeze({ target: this, arguments: Object.freeze(arguments_) }));
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'dirty-copy', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), {}, 'create');
    mount.commit();
    mount.dispose();
    drawImageCalls.length = 0;

    const prepared = executor.prepare(pair.patch, frameOf(pair.next), {});
    prepared.commit();
    prepared.rollback();
    prepared.dispose();

    expect(drawImageCalls.length).toBeGreaterThan(0);
    expect(drawImageCalls.every(call => call.arguments.length === 9)).toBe(true);
    const copiedRegions = drawImageCalls.map(call => ({
      sourceWidth: call.arguments[3],
      sourceHeight: call.arguments[4],
      destinationX: call.arguments[5],
      destinationY: call.arguments[6],
      destinationWidth: call.arguments[7],
      destinationHeight: call.arguments[8],
    }));
    expect(
      copiedRegions.every(
        region =>
          typeof region.sourceWidth === 'number' &&
          region.sourceWidth > 0 &&
          region.sourceWidth < host.width &&
          typeof region.sourceHeight === 'number' &&
          region.sourceHeight > 0 &&
          region.sourceHeight < host.height &&
          region.destinationWidth === region.sourceWidth &&
          region.destinationHeight === region.sourceHeight,
      ),
    ).toBe(true);
    const hostRegions = drawImageCalls.filter(call => call.target === host).map(call => call.arguments.slice(5, 9));
    expect(hostRegions).toHaveLength(2);
    expect(hostRegions[1]).toEqual(hostRegions[0]);
    executor.dispose();
  });

  it('Canvas 完全离屏的 entity update 只提交逻辑状态，不交换像素', () => {
    const offscreenScene = (fill: string): IRScene => ({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'offscreen', position: [1_000, 1_000], width: 10, height: 10, fill }],
    });
    const pair = createCorePair(offscreenScene('#ef4444'), offscreenScene('#22c55e'));
    const layout = Object.freeze({ x: 0, y: 0, width: 100, height: 100 });
    const current = Object.freeze({
      ...pair.current,
      scene: Object.freeze({ ...pair.current.scene, layout }),
    });
    const next = Object.freeze({
      ...pair.next,
      scene: Object.freeze({ ...pair.next.scene, layout }),
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') return drawImage;
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'offscreen-update', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    drawImage.mockClear();

    const prepared = executor.prepare(pair.patch, frameOf(next), {});
    prepared.commit();
    expect(executor.read().frame.primary).toBe(next);
    expect(drawImage).not.toHaveBeenCalled();
    prepared.rollback();
    expect(executor.read().frame.primary).toBe(current);
    expect(drawImage).not.toHaveBeenCalled();
    prepared.dispose();
    executor.dispose();
  });

  it('Canvas primitive animation update 回退 full bitmap，不进入 dirty transaction', () => {
    const pair = createCorePair(animatedScene('#ef4444', 'manual'), animatedScene('#22c55e', 'manual'));
    const drawImageArgumentCounts: Array<number> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') {
            return (...arguments_: Array<unknown>) => drawImageArgumentCounts.push(arguments_.length);
          }
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'animated-full-update', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(pair.current), { animation: { snapshotAt: 100 } }, 'create');
    mount.commit();
    mount.dispose();
    drawImageArgumentCounts.length = 0;

    const prepared = executor.prepare(pair.patch, frameOf(pair.next), { animation: { snapshotAt: 100 } });
    prepared.commit();
    prepared.rollback();
    prepared.dispose();
    expect(drawImageArgumentCounts.length).toBeGreaterThan(0);
    expect(drawImageArgumentCounts.every(count => count === 3)).toBe(true);
    executor.dispose();
  });

  it('Canvas dirty output 与 full oracle 在 overlap、miter path 与 italic text 下逐像素一致', async () => {
    const { createCanvas } = await import('@napi-rs/canvas');
    const backings = new WeakMap<HTMLCanvasElement, NapiCanvas>();
    const backingOf = (element: HTMLCanvasElement): NapiCanvas => {
      const existing = backings.get(element);
      if (existing !== undefined && existing.width === element.width && existing.height === element.height) {
        return existing;
      }
      const backing = createCanvas(element.width, element.height);
      backings.set(element, backing);
      return backing;
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const context = backingOf(this).getContext('2d');
      return new Proxy(context as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') {
            return (source: CanvasImageSource, ...arguments_: Array<unknown>) => {
              const resolved = source instanceof HTMLCanvasElement ? backingOf(source) : source;
              return Reflect.apply(Reflect.get(target, key) as (...values: Array<unknown>) => unknown, target, [
                resolved,
                ...arguments_,
              ]);
            };
          }
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
        set: (target, key, value) => Reflect.set(target, key, value, target),
      });
    });

    const currentPath: Extract<RuntimeScenePrimitive, Readonly<{ type: 'path' }>> = {
      type: 'path',
      id: 'miter',
      commands: [
        { kind: 'move', to: [20, 60] },
        { kind: 'line', to: [40, 10] },
        { kind: 'line', to: [42, 60] },
      ],
      stroke: '#ef4444',
      strokeWidth: 10,
      strokeLinejoin: 'miter',
    };
    const currentText: Extract<RuntimeScenePrimitive, Readonly<{ type: 'text' }>> = {
      type: 'text',
      id: 'italic',
      x: 42,
      y: 30,
      lines: [{ text: 'Italic', fontStyle: 'italic' }],
      fill: '#2563eb',
      fontSize: 24,
      fontStyle: 'italic',
      align: 'start',
      baseline: 'top',
      lineHeight: 28,
      measuredWidth: 52,
      measuredHeight: 28,
    };
    const overlay: Extract<RuntimeScenePrimitive, Readonly<{ type: 'rect' }>> = {
      type: 'rect',
      id: 'overlay',
      x: 70,
      y: 20,
      width: 30,
      height: 30,
      fill: '#22c55e',
    };
    const currentPrimitives: ReadonlyArray<RuntimeScenePrimitive> = [currentPath, currentText, overlay];
    const nextPrimitives: ReadonlyArray<RuntimeScenePrimitive> = [
      { ...currentPath, stroke: '#f59e0b', commands: [...currentPath.commands] },
      { ...currentText, x: 46, lines: [{ text: 'Italic!', fontStyle: 'italic' }] },
      overlay,
    ];
    const root = createRuntimeIdentity('canvas-oracle', ['root']);
    const identities = currentPrimitives.map((_, index) =>
      createRuntimeIdentity('canvas-oracle', ['item', String(index)]),
    );
    const snapshot = (revision: number, primitives: ReadonlyArray<RuntimeScenePrimitive>): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 120, height: 80 },
        resources: [],
        animations: [],
        primitives,
      },
      topology: primitives.map((primitive, index) => ({
        identity: identities[index],
        semanticOwner: identities[index],
        parent: root,
        order: index,
        primitivePath: [index],
        ...(primitive.id === undefined ? {} : { publicId: primitive.id }),
      })),
    });
    const current = snapshot(0, currentPrimitives);
    const next = snapshot(1, nextPrimitives);
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [0, 1].map(index => ({
        kind: 'update' as const,
        identity: identities[index],
        subtree: {
          root: identities[index],
          primitive: nextPrimitives[index],
          topology: [
            {
              identity: identities[index],
              semanticOwner: identities[index],
              order: 0,
              primitivePath: [],
              publicId: nextPrimitives[index].id,
            },
          ],
        },
      })),
    };

    const host = document.createElement('canvas');
    host.width = 120;
    host.height = 80;
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'pixel-oracle', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    const prepared = executor.prepare(patch, frameOf(next), {});
    prepared.commit();
    prepared.dispose();

    const oracle = document.createElement('canvas');
    oracle.width = 120;
    oracle.height = 80;
    renderToCanvas(oracle, next.scene as unknown as Scene, { devicePixelRatio: 1 });
    const actual = backingOf(host).getContext('2d').getImageData(0, 0, 120, 80).data;
    const expected = backingOf(oracle).getContext('2d').getImageData(0, 0, 120, 80).data;
    expect(Buffer.from(actual)).toEqual(Buffer.from(expected));
    executor.dispose();
  });

  it('Canvas prepare 后由后序 participant 拒绝 transaction 时不触碰 committed host', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const failure = defineRuntimeCommitParticipant<Readonly<{ ok: true }>>({
      key: 'z:prepare-failure',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: candidate => {
        if (candidate.phase === RuntimeProgramPhase.Update) throw new Error('late prepare failed');
        return { commit: () => undefined, rollback: () => undefined, dispose: () => undefined };
      },
      read: () => Object.freeze({ ok: true as const }),
      dispose: () => undefined,
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host, { participants: [failure] });
    const previousRead = handle.read(session);
    expect(drawImage).toHaveBeenCalledTimes(1);

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
      }),
    ).toThrow();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(handle.read(session)).toBe(previousRead);
    session.dispose();
  });

  it('Canvas paint 中途失败会恢复旧 bitmap 与 committed read', () => {
    let connectedPaintCount = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) {
            return () => {
              connectedPaintCount += 1;
              if (connectedPaintCount === 2) throw new Error('host draw failed after clear');
            };
          }
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host);
    const previousRead = handle.read(session);

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
      }),
    ).toThrow();
    expect(connectedPaintCount).toBe(3);
    expect(handle.read(session)).toBe(previousRead);
    session.dispose();
  });

  it('Canvas host bitmap resize 后 config-only update 强制 full repaint', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { session } = createSession('canvas', host);
    expect(drawImage).toHaveBeenCalledTimes(1);
    host.width = 300;
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, { cachePolicy: 'static' })],
    });
    expect(drawImage).toHaveBeenCalledTimes(2);
    session.dispose();
  });

  it('Canvas config size 在同一 retained session 内提交并强制 full repaint', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage' && this.isConnected) return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    document.body.appendChild(host);
    const { session } = createSession('canvas', host, { config: { canvas: { width: 200, height: 100 } } });
    expect([host.width, host.height]).toEqual([200, 100]);
    expect(drawImage).toHaveBeenCalledTimes(1);

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, { canvas: { width: 300, height: 120 } })],
    });

    expect([host.width, host.height]).toEqual([300, 120]);
    expect(drawImage).toHaveBeenCalledTimes(2);
    session.dispose();
  });

  it('Canvas 省略 DPR 时在 renderer 创建时捕获 ambient 值', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: 1 });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    document.body.appendChild(host);
    const { session } = createSession('canvas', host, {
      config: { canvas: { width: 100, height: 50 } },
      useAmbientDevicePixelRatio: true,
    });
    expect([host.width, host.height]).toEqual([100, 50]);

    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: 2 });
    session.update({
      baseRevision: session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, {
          canvas: { width: 100, height: 50 },
          cachePolicy: 'static',
        }),
      ],
    });

    expect([host.width, host.height]).toEqual([100, 50]);
    session.dispose();
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, 'devicePixelRatio');
    else Object.defineProperty(globalThis, 'devicePixelRatio', descriptor);
  });

  it('Canvas config size commit 被后序 participant 拒绝时恢复旧尺寸与像素', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    let initial = true;
    const failure = defineRuntimeCommitParticipant<Readonly<{ ok: true }>>({
      key: 'z:canvas-size-commit-failure',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: () => ({
        commit: () => {
          if (initial) initial = false;
          else throw new Error('late commit failed');
        },
        rollback: () => undefined,
        dispose: () => undefined,
      }),
      read: () => Object.freeze({ ok: true as const }),
      dispose: () => undefined,
    });
    const host = document.createElement('canvas');
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host, {
      config: { canvas: { width: 200, height: 100 } },
      participants: [failure],
    });
    const previous = handle.read(session);

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, { canvas: { width: 300, height: 120 } })],
      }),
    ).toThrow();
    expect([host.width, host.height]).toEqual([200, 100]);
    expect(handle.read(session)).toBe(previous);
    session.dispose();
  });

  it('Canvas onEvent animation 使用 per-id registry 激活 non-autoplay track', () => {
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(host);
    const { session } = createSession('canvas', host, {
      ir: animatedScene('#ef4444', { onEvent: 'click' }),
    });
    expect(requestFrame).not.toHaveBeenCalled();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 50 }));
    expect(requestFrame).toHaveBeenCalledTimes(1);
    session.dispose();
  });

  it('Canvas visible animation 只在进入视口后激活 per-id non-autoplay track', () => {
    const frames: Array<FrameRequestCallback> = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const globalAlphaValues: Array<number> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && typeof value === 'number') globalAlphaValues.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(host);
    const { session } = createSession('canvas', host, { ir: animatedScene('#ef4444', 'visible') });
    expect(frames).toHaveLength(1);
    globalAlphaValues.length = 0;
    frames[0](0);
    expect(globalAlphaValues).toContain(0);
    session.dispose();
  });

  it('Canvas 静态 entity update 保留 descriptor 未变的 clock time', () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const fillStyles: Array<unknown> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'fillStyle') fillStyles.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host, { ir: animatedScene('#ef4444', 'manual') });
    const before = handle.read(session).animation;
    expect(before).toBeDefined();
    before?.seek(123);
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, animatedScene('#22c55e', 'manual'))],
    });
    expect(handle.read(session).animation?.time).toBe(123);
    fillStyles.length = 0;
    handle.read(session).animation?.seek(124);
    expect(fillStyles).toContain('#22c55e');
    expect(fillStyles).not.toContain('#ef4444');
    session.dispose();
  });

  it('Canvas duplicate public id 仍按 identity 重启单 timeline，并刷新 coarse clock envelope', () => {
    const root = createRuntimeIdentity('canvas-animation', ['root']);
    const identities = ['node-a', 'node-b'].map(id => createRuntimeIdentity('canvas-animation', [id]));
    const primitive = (id: string, index: number, duration: number): RuntimeScenePrimitive => ({
      type: 'rect',
      id,
      x: index * 80,
      y: 0,
      width: 40,
      height: 40,
      fill: '#ef4444',
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
        },
      ],
    });
    const currentPrimitives = [primitive('duplicate', 0, 300), primitive('duplicate', 1, 300)];
    const nextPrimitives = [currentPrimitives[0], primitive('duplicate', 1, 600)];
    const snapshot = (revision: number, primitives: ReadonlyArray<RuntimeScenePrimitive>): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 240, height: 100 },
        resources: [],
        animations: [],
        primitives,
      },
      topology: primitives.map((item, index) => ({
        identity: identities[index],
        semanticOwner: identities[index],
        parent: root,
        order: index,
        primitivePath: [index],
        publicId: item.id,
      })),
    });
    const current = snapshot(0, currentPrimitives);
    const next = snapshot(1, nextPrimitives);
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [
        {
          kind: 'update',
          identity: identities[1],
          subtree: {
            root: identities[1],
            primitive: nextPrimitives[1],
            topology: [
              {
                identity: identities[1],
                semanticOwner: identities[1],
                order: 0,
                primitivePath: [],
                publicId: 'duplicate',
              },
            ],
          },
        },
      ],
    };
    let now = 0;
    const frames: Array<FrameRequestCallback> = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => (frames.push(callback), frames.length)),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const alphas: Array<number> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && typeof value === 'number') alphas.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 240;
    host.height = 100;
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'animation-test', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    const controls = executor.read().animation;
    controls?.seek(123);
    const prepared = executor.prepare(patch, frameOf(next), {});
    prepared.commit();
    prepared.dispose();
    expect(executor.read().animation).toBe(controls);
    expect(controls?.time).toBe(123);
    alphas.length = 0;
    controls?.seek(124);
    expect(alphas.some(alpha => alpha < 0.01)).toBe(true);
    expect(alphas.some(alpha => Math.abs(alpha - 124 / 300) < 0.01)).toBe(true);
    alphas.length = 0;
    now = 400;
    frames.at(-1)?.(now);
    expect(controls?.time).toBe(524);
    expect(alphas.some(alpha => Math.abs(alpha - 1) < 0.01)).toBe(true);
    expect(alphas.some(alpha => Math.abs(alpha - 401 / 600) < 0.01)).toBe(true);
    executor.dispose();
  });

  it('Canvas anonymous occurrence descriptor 变化只重启自身 timeline', () => {
    const root = createRuntimeIdentity('canvas-anonymous-animation', ['root']);
    const identities = ['a', 'b'].map(id => createRuntimeIdentity('canvas-anonymous-animation', [id]));
    const primitive = (index: number, duration: number): RuntimeScenePrimitive => ({
      type: 'rect',
      x: index * 40,
      y: 0,
      width: 20,
      height: 20,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
        },
      ],
    });
    const currentPrimitives = [primitive(0, 300), primitive(1, 300)];
    const nextPrimitives = [currentPrimitives[0], primitive(1, 600)];
    const snapshot = (revision: number, primitives: ReadonlyArray<RuntimeScenePrimitive>): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives,
      },
      topology: primitives.map((_item, index) => ({
        identity: identities[index],
        semanticOwner: identities[index],
        parent: root,
        order: index,
        primitivePath: [index],
      })),
    });
    const current = snapshot(0, currentPrimitives);
    const next = snapshot(1, nextPrimitives);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const alphas: Array<number> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && typeof value === 'number') alphas.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 100;
    host.height = 40;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-anonymous-animation', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    const controls = executor.read().animation;
    controls?.seek(123);
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [
        {
          kind: 'update',
          identity: identities[1],
          subtree: {
            root: identities[1],
            primitive: nextPrimitives[1],
            topology: [{ identity: identities[1], semanticOwner: identities[1], order: 0, primitivePath: [] }],
          },
        },
      ],
    };
    const prepared = executor.prepare(patch, frameOf(next), {});
    prepared.commit();
    prepared.dispose();
    alphas.length = 0;
    controls?.seek(124);
    expect(alphas.some(alpha => alpha < 0.01)).toBe(true);
    expect(alphas.some(alpha => Math.abs(alpha - 124 / 300) < 0.01)).toBe(true);
    executor.dispose();
  });

  it('Canvas finite coarse clock 为重启 occurrence 保留完整 descriptor 时长', () => {
    const root = createRuntimeIdentity('canvas-animation-envelope', ['root']);
    const identity = createRuntimeIdentity('canvas-animation-envelope', ['node']);
    const primitive = (duration: number): RuntimeScenePrimitive => ({
      type: 'rect',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
        },
      ],
    });
    const snapshot = (revision: number, duration: number): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 40, height: 40 },
        resources: [],
        animations: [],
        primitives: [primitive(duration)],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0] }],
    });
    const current = snapshot(0, 300);
    const next = snapshot(1, 600);
    let now = 0;
    const frames: Array<FrameRequestCallback> = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key in target ? Reflect.get(target, key) : vi.fn()),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 40;
    host.height = 40;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-animation-envelope', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    const controls = executor.read().animation;
    controls?.seek(250);
    const prepared = executor.prepare(
      {
        baseRevision: current.revision,
        nextRevision: next.revision,
        operations: [
          {
            kind: 'update',
            identity,
            subtree: {
              root: identity,
              primitive: next.scene.primitives[0],
              topology: [{ identity, semanticOwner: identity, order: 0, primitivePath: [] }],
            },
          },
        ],
      },
      frameOf(next),
      {},
    );
    prepared.commit();
    prepared.dispose();
    now = 600;
    frames.at(-1)?.(now);

    expect(controls?.time).toBe(850);
    executor.dispose();
  });

  it('Canvas 已结束 autoplay occurrence 变更后重启 coarse clock', () => {
    const root = createRuntimeIdentity('canvas-ended-autoplay', ['root']);
    const identity = createRuntimeIdentity('canvas-ended-autoplay', ['node']);
    const primitive = (duration: number): RuntimeScenePrimitive => ({
      type: 'rect',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration,
        },
      ],
    });
    const snapshot = (revision: number, duration: number): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 40, height: 40 },
        resources: [],
        animations: [],
        primitives: [primitive(duration)],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0] }],
    });
    const current = snapshot(0, 300);
    const next = snapshot(1, 600);
    let now = 0;
    const frames: Array<FrameRequestCallback> = [];
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => (key in target ? Reflect.get(target, key) : vi.fn()),
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 40;
    host.height = 40;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-ended-autoplay', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    now = 300;
    frames.shift()?.(now);
    expect(executor.read().animation?.running).toBe(false);

    const prepared = executor.prepare(
      {
        baseRevision: current.revision,
        nextRevision: next.revision,
        operations: [
          {
            kind: 'update',
            identity,
            subtree: {
              root: identity,
              primitive: next.scene.primitives[0],
              topology: [{ identity, semanticOwner: identity, order: 0, primitivePath: [] }],
            },
          },
        ],
      },
      frameOf(next),
      {},
    );
    prepared.commit();
    prepared.dispose();

    expect(executor.read().animation?.running).toBe(true);
    expect(requestFrame).toHaveBeenCalledTimes(2);
    executor.dispose();
  });

  it('Canvas descriptor 改为 visible 时重建可见性触发集合', () => {
    const root = createRuntimeIdentity('canvas-visible-rebind', ['root']);
    const identity = createRuntimeIdentity('canvas-visible-rebind', ['node']);
    const snapshot = (revision: number, trigger: 'manual' | 'visible'): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives: [
          {
            type: 'rect',
            id: 'node',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            animations: [
              {
                property: 'opacity',
                keyframes: [
                  { at: 0, value: 0 },
                  { at: 1, value: 1 },
                ],
                duration: 300,
                trigger,
              },
            ],
          },
        ],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0], publicId: 'node' }],
    });
    const current = snapshot(0, 'manual');
    const next = snapshot(1, 'visible');
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 100;
    host.height = 40;
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-visible-rebind', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    expect(requestFrame).not.toHaveBeenCalled();
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [
        {
          kind: 'update',
          identity,
          subtree: {
            root: identity,
            primitive: next.scene.primitives[0],
            topology: [{ identity, semanticOwner: identity, order: 0, primitivePath: [], publicId: 'node' }],
          },
        },
      ],
    };
    const prepared = executor.prepare(patch, frameOf(next), {});
    prepared.commit();
    prepared.dispose();
    expect(requestFrame).toHaveBeenCalledTimes(1);
    executor.dispose();
  });

  it('Canvas Scene commit 立即按 committed per-identity clock 绘制 host', () => {
    const root = createRuntimeIdentity('canvas-candidate-clock', ['root']);
    const identity = createRuntimeIdentity('canvas-candidate-clock', ['node']);
    const primitive = (fill: string): RuntimeScenePrimitive => ({
      type: 'rect',
      id: 'node',
      x: 0,
      y: 0,
      width: 20,
      height: 20,
      fill,
      animations: [
        {
          property: 'opacity',
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
          duration: 300,
          trigger: { onEvent: 'click' },
        },
      ],
    });
    const snapshot = (revision: number, fill: string): SceneRuntimeSnapshot => ({
      revision: revision as SceneRuntimeSnapshot['revision'],
      root,
      scene: {
        layout: { x: 0, y: 0, width: 100, height: 40 },
        resources: [],
        animations: [],
        primitives: [primitive(fill)],
      },
      topology: [{ identity, semanticOwner: identity, parent: root, order: 0, primitivePath: [0], publicId: 'node' }],
    });
    const current = snapshot(0, '#ef4444');
    const next = snapshot(1, '#22c55e');
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const committedAlphas: Array<number> = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'isPointInPath') return () => true;
          if (key === 'isPointInStroke') return () => false;
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => {
          if (key === 'globalAlpha' && this.isConnected && typeof value === 'number') committedAlphas.push(value);
          return Reflect.set(target, key, value);
        },
      });
    });
    const host = document.createElement('canvas');
    host.width = 100;
    host.height = 40;
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(host);
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'canvas-candidate-clock', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();
    host.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }));
    executor.read().animation?.seek(120);
    committedAlphas.length = 0;
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: [
        {
          kind: 'update',
          identity,
          subtree: {
            root: identity,
            primitive: next.scene.primitives[0],
            topology: [{ identity, semanticOwner: identity, order: 0, primitivePath: [], publicId: 'node' }],
          },
        },
      ],
    };
    const prepared = executor.prepare(patch, frameOf(next), {});
    prepared.commit();
    prepared.dispose();
    expect(committedAlphas.some(alpha => Math.abs(alpha - 0.4) < 0.01)).toBe(true);
    executor.dispose();
  });

  it('Canvas snapshotAt 只发布静态截帧，不暴露可改写画面的 live controls', () => {
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { handle, session } = createSession('canvas', host, {
      ir: animatedScene('#ef4444', 'manual'),
      config: { animation: { snapshotAt: 150 } },
    });
    expect(handle.read(session).animation).toBeUndefined();
    expect(requestFrame).not.toHaveBeenCalled();
    session.dispose();
  });

  it('Canvas image paint 在 resource ready 后使用 renderer-lifetime cache 重绘', () => {
    class TestImage {
      static latest: TestImage | undefined;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = '';
      constructor() {
        TestImage.latest = this;
      }
    }
    vi.stubGlobal('Image', TestImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    document.body.appendChild(host);
    const { session } = createSession('canvas', host, {
      ir: {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', id: 'image', position: [0, 0], fill: { kind: 'image', href: 'pic.png' } }],
      },
    });
    const image = TestImage.latest;
    expect(image).toBeDefined();
    const lateLoad = image?.onload;
    lateLoad?.(new Event('load'));
    expect(drawImage.mock.calls.some(([source]) => source === image)).toBe(true);
    const committedDrawCount = drawImage.mock.calls.length;
    session.dispose();
    lateLoad?.(new Event('load'));
    expect(drawImage).toHaveBeenCalledTimes(committedDrawCount);
    expect(image?.onload).toBeNull();
  });

  it('Canvas image candidate 在 prepare 后 ready、commit 前完成时补绘 committed bitmap', () => {
    class TestImage {
      static latest: TestImage | undefined;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = '';
      constructor() {
        TestImage.latest = this;
      }
    }
    vi.stubGlobal('Image', TestImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const imageScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'image', position: [0, 0], fill: { kind: 'image', href: 'race.png' } }],
    };
    const { current, next, patch } = createCorePair(scene('#ef4444'), imageScene);
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'image-race-test', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    const mount = executor.prepareMount(frameOf(current), {}, 'create');
    mount.commit();
    mount.dispose();

    const prepared = executor.prepare(patch, frameOf(next), {});
    const image = TestImage.latest;
    expect(image).toBeDefined();
    image?.onload?.(new Event('load'));
    expect(drawImage.mock.calls.some(([source]) => source === image)).toBe(false);
    prepared.commit();
    prepared.dispose();
    expect(drawImage.mock.calls.some(([source]) => source === image)).toBe(true);
    executor.dispose();
  });

  it('Canvas image resource 在 candidate rollback 与 consumer remove 后释放 staging entry', () => {
    class TestImage {
      static instances: Array<TestImage> = [];
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = '';
      constructor() {
        TestImage.instances.push(this);
      }
    }
    vi.stubGlobal('Image', TestImage);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      return new Proxy({ canvas: this, globalAlpha: 1 } as unknown as CanvasRenderingContext2D, {
        get: (target, key) => {
          if (key === 'drawImage') return drawImage;
          if (key === 'measureText') return () => ({ width: 0 });
          if (key === 'createLinearGradient' || key === 'createRadialGradient') {
            return () => ({ addColorStop: vi.fn() });
          }
          if (key in target) return Reflect.get(target, key);
          return vi.fn();
        },
        set: (target, key, value) => Reflect.set(target, key, value),
      });
    });
    const imageScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'image', position: [0, 0], fill: { kind: 'image', href: 'candidate.png' } }],
    };
    const failure = defineRuntimeCommitParticipant<Readonly<{ ok: true }>>({
      key: 'z:image-failure',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: candidate => ({
        commit: () => {
          if (candidate.phase === RuntimeProgramPhase.Update) throw new Error('reject image candidate');
        },
        rollback: () => undefined,
        dispose: () => undefined,
      }),
      read: () => Object.freeze({ ok: true as const }),
      dispose: () => undefined,
    });
    const rollbackHost = document.createElement('canvas');
    rollbackHost.width = 200;
    rollbackHost.height = 100;
    document.body.appendChild(rollbackHost);
    const rollbackSession = createSession('canvas', rollbackHost, { participants: [failure] }).session;
    expect(() =>
      rollbackSession.update({
        baseRevision: rollbackSession.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, imageScene)],
      }),
    ).toThrow();
    const rolledBackImage = TestImage.instances.at(-1);
    expect(rolledBackImage?.onload).toBeNull();
    rollbackSession.dispose();

    const removalHost = document.createElement('canvas');
    removalHost.width = 200;
    removalHost.height = 100;
    document.body.appendChild(removalHost);
    const removalSession = createSession('canvas', removalHost, { ir: imageScene }).session;
    const committedImage = TestImage.instances.at(-1);
    expect(committedImage?.onload).not.toBeNull();
    removalSession.update({
      baseRevision: removalSession.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#ef4444'))],
    });
    expect(committedImage?.onload).toBeNull();
    removalSession.dispose();
  });

  it('Canvas image resource 在 prepare 抛错时立即释放 candidate staging entry', () => {
    class TestImage {
      static latest: TestImage | undefined;
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = '';
      constructor() {
        TestImage.latest = this;
      }
    }
    vi.stubGlobal('Image', TestImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('bitmap prepare failed');
    });
    const imageScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'image', position: [0, 0], fill: { kind: 'image', href: 'prepare.png' } }],
    };
    const snapshot = createCorePair(scene('#ef4444'), imageScene).next;
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'image-prepare-test', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    expect(() => executor.prepareMount(frameOf(snapshot), {}, 'create')).toThrow('bitmap prepare failed');
    expect(TestImage.latest?.onload).toBeNull();
    executor.dispose();
  });

  it('Canvas 多 image ensure 中途抛错时释放此前全部 candidate entries', () => {
    class TestImage {
      static instances: Array<TestImage> = [];
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      private value = '';
      constructor() {
        TestImage.instances.push(this);
      }
      set src(value: string) {
        this.value = value;
        if (value === 'second.png') throw new Error('second image rejected');
      }
      get src(): string {
        return this.value;
      }
    }
    vi.stubGlobal('Image', TestImage);
    const imageScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'first', position: [0, 0], fill: { kind: 'image', href: 'first.png' } },
        { type: 'node', id: 'second', position: [80, 0], fill: { kind: 'image', href: 'second.png' } },
      ],
    };
    const snapshot = createCorePair(scene('#ef4444'), imageScene).next;
    const host = document.createElement('canvas');
    host.width = 200;
    host.height = 100;
    const renderer = builtinRetainedRendererFactory({
      backend: 'canvas',
      host,
      immutableOptions: { backend: 'canvas', idPrefix: 'image-ensure-cleanup', devicePixelRatio: 1 },
    });
    const executor = getRetainedRendererExecutor(renderer);
    if (executor === undefined) throw new Error('expected builtin Canvas renderer executor');
    expect(() => executor.prepareMount(frameOf(snapshot), {}, 'create')).toThrow('second image rejected');
    expect(TestImage.instances).toHaveLength(2);
    expect(TestImage.instances.every(image => image.onload === null && image.onerror === null)).toBe(true);
    executor.dispose();
  });

  it('后序 participant commit 失败时恢复 SVG DOM 与旧 committed read identity', () => {
    const failure = defineRuntimeCommitParticipant<Readonly<{ ok: true }>>({
      key: 'z:failure',
      owners: [],
      programs: [],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: candidate => ({
        commit: () => {
          if (candidate.phase === RuntimeProgramPhase.Update) throw new Error('late commit failed');
        },
        rollback: () => undefined,
        dispose: () => undefined,
      }),
      read: () => Object.freeze({ ok: true as const }),
      dispose: () => undefined,
    });
    const host = document.createElementNS(SVG_NAMESPACE, 'svg');
    const { handle, session } = createSession('svg', host, { participants: [failure] });
    const previousRead = handle.read(session);
    const previousMarkup = host.innerHTML;
    const node = host.querySelector('[data-retikz-id="node-a"]');

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene('#22c55e'))],
      }),
    ).toThrow();
    expect(handle.read(session)).toBe(previousRead);
    expect(host.innerHTML).toBe(previousMarkup);
    expect(host.querySelector('[data-retikz-id="node-a"]')).toBe(node);
    session.dispose();
  });
});
