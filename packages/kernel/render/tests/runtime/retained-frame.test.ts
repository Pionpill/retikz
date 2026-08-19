import type { CoreProgramOutput, IRScene, Scene } from '@retikz/core';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  RetikzRuntimeErrorCode,
} from '@retikz/runtime';
import { describe, expect, it, vi } from 'vitest';

import type {
  RenderFrameSnapshot,
  RenderReadonlyLayer,
  RetainedRendererFactory,
  StaticRenderFrame,
} from '../../src/runtime';

import {
  createRetainedRenderParticipant,
  defineRetainedRenderer,
  RenderRuntimeOwnerDefinition,
  RetikzRetainedRenderErrorCode,
} from '../../src/runtime';

const svgHost = Object.freeze({ tagName: 'svg', namespaceURI: 'http://www.w3.org/2000/svg' }) as SVGSVGElement;

const source = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node', position: [0, 0], text }],
});

const layerScene = (width: number): Scene => ({
  layout: { x: 0, y: 0, width, height: 10 },
  primitives: [{ type: 'rect', x: 0, y: 0, width, height: 10, stroke: '#2563eb' }],
});

const layersFrom = (output: CoreProgramOutput<readonly []>): ReadonlyArray<RenderReadonlyLayer> =>
  Object.freeze([
    Object.freeze({
      key: 'guide',
      scene: layerScene(output.result.scene.layout.width),
      transform: Object.freeze([1, 0, 0, 1, 2, 3] as const),
    }),
  ]);

const createHarness = (
  readonlyLayerCapability: 'supported' | 'unsupported',
  options: Readonly<{
    expectedInitialFrame?: StaticRenderFrame;
    onPrepareMount?: (frame: RenderFrameSnapshot) => void;
    resolveReadonlyLayers?: (output: CoreProgramOutput<readonly []>) => ReadonlyArray<RenderReadonlyLayer>;
  }> = {},
) => {
  let current: RenderFrameSnapshot | undefined;
  const prepareMount = vi.fn((frame: RenderFrameSnapshot) => {
    options.onPrepareMount?.(frame);
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
  const prepare = vi.fn((_patch: unknown, frame: RenderFrameSnapshot) => {
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
    readonlyLayerCapability,
    prepareMount,
    prepare,
    read: () => {
      if (current === undefined) throw new Error('renderer is not committed');
      return Object.freeze({ frame: current });
    },
    dispose: () => undefined,
  });
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const handle = createRetainedRenderParticipant({
    backend: 'svg',
    host: svgHost,
    immutableOptions: { backend: 'svg', idPrefix: 'retained-frame' },
    rendererFactory: (() => renderer) as unknown as RetainedRendererFactory,
    coreProgram,
    ...(options.expectedInitialFrame === undefined ? {} : { expectedInitialFrame: options.expectedInitialFrame }),
    ...(options.resolveReadonlyLayers === undefined ? {} : { resolveReadonlyLayers: options.resolveReadonlyLayers }),
  });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition, RenderRuntimeOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  const session = createRuntimeSession({
    owners,
    programs,
    participants: [handle.participant],
    initialSnapshots: [
      createRuntimeOwnerInput(CoreOwnerDefinition, source('initial')),
      createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, {}),
    ],
  });
  return { coreProgram, handle, prepare, prepareMount, renderer, session };
};

describe('retained render frame contract', () => {
  it('exposes readonlyLayerCapability on the nominal token', () => {
    const harness = createHarness('supported');
    expect(harness.renderer.readonlyLayerCapability).toBe('supported');
    harness.session.dispose();
  });

  it('uses one frozen empty layer array when no resolver is provided', () => {
    const harness = createHarness('unsupported');
    const frame = harness.prepareMount.mock.calls[0][0];

    expect(frame.layers).toEqual([]);
    expect(Object.isFrozen(frame.layers)).toBe(true);
    expect(harness.handle.read(harness.session).frame).toBe(frame);
    harness.session.dispose();
  });

  it('rejects non-empty layers on unsupported renderers before prepareMount', () => {
    const onPrepareMount = vi.fn();
    expect(() => createHarness('unsupported', { onPrepareMount, resolveReadonlyLayers: layersFrom })).toThrowError(
      expect.objectContaining({
        cause: expect.objectContaining({
          code: RetikzRetainedRenderErrorCode.RetainedRendererReadonlyLayerUnsupported,
        }),
      }),
    );
    expect(onPrepareMount).not.toHaveBeenCalled();
  });

  it('resolves initial, Core update, and config-only candidates from the available Core output', () => {
    const outputs: Array<CoreProgramOutput<readonly []>> = [];
    const harness = createHarness('supported', {
      resolveReadonlyLayers: output => {
        outputs.push(output);
        return layersFrom(output);
      },
    });
    const initialOutput = harness.session.artifact(harness.coreProgram).value.output;
    const initialFrame = harness.handle.read(harness.session).frame;

    expect(outputs).toEqual([initialOutput]);
    expect(initialFrame.layers[0]?.scene.layout.width).toBe(initialOutput.result.scene.layout.width);

    harness.session.update({
      baseRevision: harness.session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, source('updated content'))],
    });
    const updatedOutput = harness.session.artifact(harness.coreProgram).value.output;
    const updatedFrame = harness.handle.read(harness.session).frame;
    expect(outputs.at(-1)).toBe(updatedOutput);
    expect(updatedFrame.primary.revision).toBe(harness.session.revision());

    harness.session.update({
      baseRevision: harness.session.revision(),
      owners: [createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, { animation: { enabled: false } })],
    });
    const configFrame = harness.handle.read(harness.session).frame;
    expect(outputs.at(-1)).toBe(updatedOutput);
    expect(configFrame.primary.revision).toBe(harness.session.revision());
    expect(configFrame.layers).not.toBe(updatedFrame.layers);
    harness.session.dispose();
  });

  it('keeps the previous committed whole frame when layer resolution fails', () => {
    let reject = false;
    const harness = createHarness('supported', {
      resolveReadonlyLayers: output => {
        if (reject) throw new Error('layer resolver failed');
        return layersFrom(output);
      },
    });
    const previous = harness.handle.read(harness.session).frame;
    const prepareCalls = harness.prepare.mock.calls.length;
    reject = true;

    expect(() =>
      harness.session.update({
        baseRevision: harness.session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, source('rejected'))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ParticipantPrepareFailed,
        cause: expect.objectContaining({ message: 'layer resolver failed' }),
      }),
    );
    expect(harness.prepare).toHaveBeenCalledTimes(prepareCalls);
    expect(harness.handle.read(harness.session).frame).toBe(previous);
    harness.session.dispose();
  });

  it('rejects an SSR seed whose primary or layers differ from the initial frame', () => {
    expect(() =>
      createHarness('supported', {
        expectedInitialFrame: {
          primary: { layout: { x: 0, y: 0, width: 1, height: 1 }, primitives: [] },
          layers: Object.freeze([]),
        },
        resolveReadonlyLayers: layersFrom,
      }),
    ).toThrowError(
      expect.objectContaining({
        cause: expect.objectContaining({ code: RetikzRetainedRenderErrorCode.RetainedRendererInitialFrameMismatch }),
      }),
    );
  });
});
