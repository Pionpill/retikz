import type { AnyClipShapeDefinition, ClipDefinition } from '@retikz/core';

import { compileToScene, defineClip, defineClipShape } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { InputEmbedAdapter, InputScene } from '../../src';

import {
  createProcessingController,
  normalizeScene,
  prepareProcessingInput,
  processToStaticInputResult,
} from '../../src';

const customClip = (): ClipDefinition =>
  defineClip({
    kind: 'ticketClip',
    schema: z.strictObject({ kind: z.literal('ticketClip') }),
    resolve: () => ({ kind: 'ticketPath' }),
  });

const customClipShape = (): AnyClipShapeDefinition =>
  defineClipShape({
    kind: 'ticketPath',
    schema: z.strictObject({ kind: z.literal('ticketPath') }),
    lower: () => ({
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [20, 0] },
        { kind: 'line', to: [10, 10] },
        { kind: 'close' },
      ],
      fillRule: 'nonzero',
    }),
  });

const input: InputScene = {
  children: [
    {
      type: 'scope',
      clip: { kind: 'ticketClip' },
      children: [{ id: 'ticket', position: [10, 5], text: 'A' }],
    },
  ],
};

describe('Vanilla ClipShape processing parity', () => {
  it('preserves explicit clipShapes through InputScene static and retained processing', () => {
    const compile = { clips: [customClip()], clipShapes: [customClipShape()] };
    const direct = compileToScene(normalizeScene(input).ir, compile).scene;
    const staticResult = processToStaticInputResult(input, { compile });
    const retained = createProcessingController(input, { compile });

    expect(staticResult.scene).toEqual(direct);
    expect(retained.read().scene).toEqual(direct);
    expect(direct.resources).toEqual([
      expect.objectContaining({ kind: 'clip', path: expect.objectContaining({ fillRule: 'nonzero' }) }),
    ]);

    retained.dispose();
  });

  it('includes explicit clipShapes in provider-graph conflict checks', () => {
    const contributed = customClipShape();
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'ticketClipShape',
      lower: () => ({
        node: { type: 'node', id: 'ticket-shape', position: [0, 0] },
        providerDependencies: {
          roots: [{ capability: 'clipShape', name: 'ticketPath' }],
          providers: [
            {
              key: { capability: 'clipShape', name: 'ticketPath' },
              dependencies: [],
              datasets: {},
              makeDefinition: () => contributed,
            },
          ],
        },
      }),
    };
    const embedded: InputScene = {
      children: [{ type: 'embed', kind: 'ticketClipShape', id: 'ticket-shape', props: {} }],
    };

    expect(() =>
      prepareProcessingInput(embedded, {
        adapters: [adapter],
        compile: { clipShapes: [customClipShape()] },
      }),
    ).toThrow(/definition conflict for clipShape:ticketPath/i);
  });
});
