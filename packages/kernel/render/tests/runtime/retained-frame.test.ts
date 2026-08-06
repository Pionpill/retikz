import type { IRScene } from '@retikz/core';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import {
  CompositeBaseSchema,
  CoreOwnerDefinition,
  createCoreProgram,
  defineComposite,
  defineInspector,
} from '@retikz/core';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { RenderFrameSnapshot, RetainedRendererFactory, StaticRenderFrame } from '../../src/runtime';

import {
  createRetainedRenderParticipant,
  defineRetainedRenderer,
  RenderRuntimeOwnerDefinition,
  RetainedRenderErrorCode,
} from '../../src/runtime';

const svgHost = Object.freeze({ tagName: 'svg', namespaceURI: 'http://www.w3.org/2000/svg' }) as SVGSVGElement;

const layoutDefinition = defineComposite({
  namespace: 'test',
  type: 'layout',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('layout') }),
  artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
  inspector: defineInspector({
    kind: 'composite',
    optionsInputSchema: z.strictObject({}),
    optionsSchema: z.strictObject({}),
    inspect: (artifact: { width: number; height: number }) => ({
      type: 'path',
      stroke: '#2563eb',
      dashPattern: [6, 4],
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [artifact.width, 0] },
        { type: 'step', kind: 'line', to: [artifact.width, artifact.height] },
        { type: 'step', kind: 'line', to: [0, artifact.height] },
        { type: 'step', kind: 'line', to: [0, 0] },
      ],
    }),
  }),
  compile: () => ({
    children: [{ type: 'node', position: [0, 0], text: 'content' }],
    artifact: { width: 40, height: 20 },
  }),
});

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'test', type: 'layout' }],
};

const noopToken = (): RuntimePreparedCommit =>
  Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined });

const createSession = (inspectionCapability: 'supported' | 'unsupported', expectedInitialFrame?: StaticRenderFrame) => {
  let current: RenderFrameSnapshot | undefined;
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
  const renderer = defineRetainedRenderer({
    backend: 'svg',
    host: svgHost,
    capability: 'entity',
    inspectionCapability,
    prepareMount,
    prepare: (_patch, frame) => {
      current = frame;
      return noopToken();
    },
    read: () => {
      if (current === undefined) throw new Error('renderer is not committed');
      return Object.freeze({ frame: current });
    },
    dispose: () => undefined,
  });
  const coreProgram = createCoreProgram({
    composites: [layoutDefinition],
    inspection: { root: { layout: true } },
    onWarn: () => undefined,
  });
  const handle = createRetainedRenderParticipant({
    backend: 'svg',
    host: svgHost,
    immutableOptions: { backend: 'svg', idPrefix: 'retained-frame' },
    rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
    coreProgram,
    ...(expectedInitialFrame === undefined ? {} : { expectedInitialFrame }),
  });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const mount = () =>
    createRuntimeSession({
      owners,
      programs,
      participants: [handle.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, source),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
      ],
    });
  return { handle, mount, prepareMount, renderer };
};

describe('retained render frame contract', () => {
  it('renderer definition 必须声明 inspectionCapability，并将其暴露在 nominal token', () => {
    expect(() =>
      defineRetainedRenderer({
        backend: 'svg',
        host: svgHost,
        capability: 'entity',
        prepareMount: noopToken,
        prepare: noopToken,
        read: () => {
          throw new Error('unused');
        },
        dispose: () => undefined,
      } as never),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRendererInvalid }));

    const { renderer } = createSession('supported');
    expect(renderer.inspectionCapability).toBe('supported');
  });

  it('unsupported renderer 在调用 prepareMount 前拒绝 non-null inspection', () => {
    const harness = createSession('unsupported');

    expect(harness.mount).toThrowError(
      expect.objectContaining({
        cause: expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRendererInspectionUnsupported }),
      }),
    );
    expect(harness.prepareMount).not.toHaveBeenCalled();
  });

  it('supported renderer 原子接收并读取同一 revision 的完整 frame', () => {
    const harness = createSession('supported');
    const session = harness.mount();
    const frame = harness.prepareMount.mock.calls[0][0];

    expect(frame.primary.scene.primitives).not.toHaveLength(0);
    expect(frame.inspection).not.toBeNull();
    if (frame.inspection === null) throw new Error('expected inspection plane');
    expect(frame.inspection.entries).toHaveLength(1);
    expect(harness.handle.read(session).frame).toBe(frame);
    session.dispose();
  });

  it('在调用 SVG renderer 前拒绝与首个 runtime frame 不一致的 seed', () => {
    const harness = createSession('supported', {
      primary: { layout: { x: 0, y: 0, width: 1, height: 1 }, primitives: [] },
      inspection: null,
    });

    expect(harness.mount).toThrowError(
      expect.objectContaining({
        cause: expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRendererInitialFrameMismatch }),
      }),
    );
    expect(harness.prepareMount).not.toHaveBeenCalled();
  });
});
