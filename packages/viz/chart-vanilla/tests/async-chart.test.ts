import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { processToStaticInputResultAsync, scene } from '@retikz/vanilla';
import { describe, expect, it, vi } from 'vitest';

import { renderChartAsync } from '../src';
import { scatterChart, scatterChartInputEmbedAdapter } from '../src/point';

describe('Chart 异步数据准备', () => {
  it('通过生成的 Surface 和 Flex 表示绑定 Promise 输出，无需重新执行', async () => {
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
      plotExtension: { transform: [{ operation: { kind: 'normalize', params: { field: 'y', as: 'ratio' } } }] },
      panel: { position: [24, 12], transforms: [{ kind: 'scale', x: 0.5 }], zIndex: 3 },
      encodings: {
        x: 'x',
        y: 'ratio',
      },
    });
    const result = await renderChartAsync(input, {
      adapters: [scatterChartInputEmbedAdapter],
    });
    const svg = result.svg;

    expect(svg).toContain('Prepared chart');
    expect(svg).toContain('translate(24 12)');
    expect(svg.match(/<ellipse/g)).toHaveLength(2);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('继承生成声明的根模式，同时保留显式声明覆盖', async () => {
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
      plotExtension: {
        transform: [
          { operation: { kind: 'normalize', params: { field: 'y', as: 'ratio' } }, dataExecution: { mode: 'builtin' } },
        ],
      },
      encodings: {
        x: 'x',
        y: 'ratio',
      },
    });
    const result = await renderChartAsync(input, {
      adapters: [scatterChartInputEmbedAdapter],
    });

    expect(result.svg.match(/<ellipse/g)).toHaveLength(1);
    expect(external).not.toHaveBeenCalled();

    const inherited = scatterChart({
      ...input.props,
      encodings: { x: 'x', y: { aggregate: { kind: 'mean', field: 'y', as: 'meanY' } } },
    });

    await expect(
      processToStaticInputResultAsync(scene({ children: [inherited] }), { adapters: [scatterChartInputEmbedAdapter] }),
    ).rejects.toThrow(/unsupported fixture/);
    expect(external).toHaveBeenCalledWith('summarize');
  });
});
