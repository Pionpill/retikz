import { pathClipProvider } from '@retikz/extension';
import {
  createSurface,
  createFrame,
  frameDefinition,
  frameProvider,
  surfaceProvider,
} from '@retikz/standard/presentation';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import { normalizeScene, processToStaticInputResultAsync, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { frame, frameInputEmbedAdapter, surface, surfaceChild, surfaceInputEmbedAdapter } from '../src/presentation';

describe('表面（）', () => {
  it('通过 Surface 探测转发任意嵌套复合组件的准备输入', async () => {
    let executions = 0;
    const definition = {
      ...frameDefinition,
      compile: (
        _node: Parameters<typeof frameDefinition.compile>[0],
        context: Parameters<typeof frameDefinition.compile>[1],
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
        adapters: [surfaceInputEmbedAdapter, adapter],
        compile: { composites: [definition] },
      },
    );

    expect(JSON.stringify(result.scene)).toContain('surface-ready');
    expect(executions).toBe(1);
  });

  it('包装原始 Core 子项，而不创建子项依赖项', () => {
    const child = surfaceChild({ type: 'node', position: [0, 0], text: 'A' });
    const normalized = normalizeScene(scene({ children: [surface({ padding: 4, child })] }), {
      adapters: [surfaceInputEmbedAdapter],
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
      roots: [surfaceProvider.key],
      providers: [surfaceProvider, pathClipProvider],
    });
    expect(normalized.ir.children[0]).not.toHaveProperty('id');

    const explicit = normalizeScene(scene({ children: [surface({ id: 'surface-model', padding: 4, child })] }), {
      adapters: [surfaceInputEmbedAdapter],
    });

    expect(explicit.ir.children[0]).toHaveProperty('id', 'surface-model');
  });

  it('按编写顺序保留 Surface 之后的显式嵌套第 2 层依赖项', () => {
    const childEmbed = frame({ children: [{ type: 'node', position: [0, 0], text: 'A' }] });
    const normalized = normalizeScene(scene({ children: [surface({ child: surfaceChild(childEmbed) })] }), {
      adapters: [surfaceInputEmbedAdapter, frameInputEmbedAdapter],
    });

    expect(normalized.contributions[0]?.roots).toEqual([surfaceProvider.key, frameProvider.key]);
    expect(normalized.contributions[0]?.providers).toEqual([surfaceProvider, pathClipProvider, frameProvider]);
  });

  it('通过公共 Vanilla 嵌入进行规范化，而不会将运行时子元数据泄漏到 IR 中', () => {
    const result = normalizeScene(
      scene({
        children: [surface({ child: surfaceChild({ type: 'node', position: [0, 0] }) })],
      }),
      { adapters: [surfaceInputEmbedAdapter] },
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
