import { PathClipProvider } from '@retikz/extension';
import {
  createSurface,
  createFrame,
  FrameDefinition,
  FrameProvider,
  SurfaceProvider,
} from '@retikz/standard/presentation';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import { normalizeScene, processToStaticInputResultAsync, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { frame, FrameInputEmbedAdapter, surface, surfaceChild, SurfaceInputEmbedAdapter } from '../src/presentation';

describe('surface()', () => {
  it('forwards prepared input for an arbitrary nested composite through Surface probes', async () => {
    let executions = 0;
    const definition = {
      ...FrameDefinition,
      compile: (
        _node: Parameters<typeof FrameDefinition.compile>[0],
        context: Parameters<typeof FrameDefinition.compile>[1],
      ) => ({
        children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: String(context.runtimeInput) }],
      }),
    };
    const adapter: InputEmbedAdapter<unknown> & Required<Pick<InputEmbedAdapter<unknown>, 'prepare'>> = {
      kind: 'prepared',
      prepare: () => ({
        execute: () => {
          executions++;
          return {
            node: createFrame({ children: [{ type: 'node', position: [0, 0], text: 'source-child' }] }),
            runtimeInputs: [{ path: [], input: 'surface-ready' }],
            providerDependencies: { roots: [], providers: [] },
          };
        },
      }),
    };
    const result = await processToStaticInputResultAsync(
      scene({ children: [surface({ padding: 4, child: { type: 'embed', kind: 'prepared', props: {} } })] }),
      {
        adapters: [SurfaceInputEmbedAdapter, adapter],
        compile: { composites: [definition] },
      },
    );
    expect(JSON.stringify(result.scene)).toContain('surface-ready');
    expect(executions).toBe(1);
  });
  it('wraps a raw Core child without inventing child dependencies', () => {
    const child = surfaceChild({ type: 'node', position: [0, 0], text: 'A' });
    const normalized = normalizeScene(scene({ children: [surface({ padding: 4, child })] }), {
      adapters: [SurfaceInputEmbedAdapter],
    });

    expect(normalized.ir.children[0]).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        padding: 4,
        child: { type: 'node', position: [0, 0], text: 'A' },
      }),
    );
    expect(normalized.contributions[0]).toEqual({
      roots: [SurfaceProvider.key],
      providers: [SurfaceProvider, PathClipProvider],
    });
    expect(normalized.ir.children[0]).not.toHaveProperty('id');

    const explicit = normalizeScene(scene({ children: [surface({ id: 'surface-model', padding: 4, child })] }), {
      adapters: [SurfaceInputEmbedAdapter],
    });
    expect(explicit.ir.children[0]).toHaveProperty('id', 'surface-model');
  });

  it('preserves explicit nested Tier-2 dependencies after Surface in authored order', () => {
    const childEmbed = frame({ children: [{ type: 'node', position: [0, 0], text: 'A' }] });
    const normalized = normalizeScene(scene({ children: [surface({ child: surfaceChild(childEmbed) })] }), {
      adapters: [SurfaceInputEmbedAdapter, FrameInputEmbedAdapter],
    });

    expect(normalized.contributions[0]?.roots).toEqual([SurfaceProvider.key, FrameProvider.key]);
    expect(normalized.contributions[0]?.providers).toEqual([SurfaceProvider, PathClipProvider, FrameProvider]);
  });

  it('normalizes through the public Vanilla embed without leaking runtime child metadata into IR', () => {
    const result = normalizeScene(
      scene({
        children: [surface({ child: surfaceChild({ type: 'node', position: [0, 0] }) })],
      }),
      { adapters: [SurfaceInputEmbedAdapter] },
    );

    expect(result.ir.children[0]).toEqual(
      createSurface({
        namespace: 'standard',
        type: 'surface',
        child: { type: 'node', position: [0, 0] },
      }),
    );
    expect(result.ir.children[0]).not.toHaveProperty('id');
    expect(JSON.stringify(result.ir)).not.toContain('providerDependencies');
  });
});
