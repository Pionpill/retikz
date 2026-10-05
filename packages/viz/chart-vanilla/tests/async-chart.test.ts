import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { processToStaticInputResultAsync, scene } from '@retikz/vanilla';
import { describe, expect, it, vi } from 'vitest';

import { renderChartAsync } from '../src';
import { scatterChart, ScatterChartInputEmbedAdapter } from '../src/point';

describe('Chart async data preparation', () => {
  it('binds Promise output through generated Surface and Flex presentation without reexecution', async () => {
    const execute = vi.fn();
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => ({
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: async input => {
            await Promise.resolve();
            if (input.kind !== 'result') throw new Error('canonical fixture required');

            execute();

            return { rows: input.result.rows.map(row => ({ ...row, ratio: 0.75 })), model: stage.outputModel };
          },
        },
      }),
    };
    const input = scatterChart({
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
      ],
      dataExecution: { mode: 'external', external: 'fixture' },
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
      title: 'Prepared chart',
      encodings: {
        x: 'x',
        y: { transform: { operation: { kind: 'normalize', field: 'y', as: 'ratio' } }, output: 'ratio' },
      },
    });
    const result = await renderChartAsync(input, {
      adapters: [ScatterChartInputEmbedAdapter],
    });
    const svg = result.svg;

    expect(svg).toContain('Prepared chart');
    expect(svg.match(/<ellipse/g)).toHaveLength(2);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('inherits root mode for generated declarations while preserving an explicit declaration override', async () => {
    const external = vi.fn();
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => {
        external(stage.operation.kind);
        return { kind: 'unsupported', diagnostics: [{ code: 'fixture', message: 'unsupported fixture' }] };
      },
    };
    const input = scatterChart({
      dataBindings: {
        'chart.data': {
          kind: 'result',
          result: {
            rows: [{ x: 1, y: 2 }],
            model: [
              { name: 'x', type: 'continuous' },
              { name: 'y', type: 'continuous' },
            ],
          },
        },
      },
      dataExecution: { mode: 'external', external: 'fixture' },
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
      encodings: {
        x: 'x',
        y: {
          transform: { operation: { kind: 'normalize', field: 'y', as: 'ratio' }, dataExecution: { mode: 'builtin' } },
          output: 'ratio',
        },
      },
    });
    const result = await renderChartAsync(input, {
      adapters: [ScatterChartInputEmbedAdapter],
    });

    expect(result.svg.match(/<ellipse/g)).toHaveLength(1);
    expect(external).not.toHaveBeenCalled();

    const inherited = scatterChart({
      ...input.props,
      encodings: { x: 'x', y: { aggregate: { kind: 'mean', field: 'y', as: 'meanY' } } },
    });

    await expect(
      processToStaticInputResultAsync(scene({ children: [inherited] }), { adapters: [ScatterChartInputEmbedAdapter] }),
    ).rejects.toThrow(/unsupported fixture/);
    expect(external).toHaveBeenCalledWith('summarize');
  });
});
