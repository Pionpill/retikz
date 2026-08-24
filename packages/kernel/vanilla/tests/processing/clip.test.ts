import type { ClipDefinition } from '@retikz/core';

import { compileToScene, defineClip } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

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
    schema: strictObject({ kind: literal('ticketClip') }),
    resolve: () => ({ kind: 'ticketClip' }),
    shapeSchema: strictObject({ kind: literal('ticketClip') }),
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

describe('Vanilla Clip processing parity', () => {
  it('preserves complete clips through InputScene static and retained processing', () => {
    const compile = { clips: [customClip()] };
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

  it('includes explicit clips in provider-graph conflict checks', () => {
    const contributed = customClip();
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'ticketClip',
      lower: () => ({
        node: { type: 'node', id: 'ticket', position: [0, 0] },
        providerDependencies: {
          roots: [{ capability: 'clip', name: 'ticketClip' }],
          providers: [
            {
              key: { capability: 'clip', name: 'ticketClip' },
              dependencies: [],
              datasets: {},
              makeDefinition: () => contributed,
            },
          ],
        },
      }),
    };
    const embedded: InputScene = {
      children: [{ type: 'embed', kind: 'ticketClip', id: 'ticket', props: {} }],
    };

    expect(() =>
      prepareProcessingInput(embedded, {
        adapters: [adapter],
        compile: { clips: [customClip()] },
      }),
    ).toThrow(/definition conflict for clip:ticketClip/i);
  });
});
