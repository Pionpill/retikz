import { prepareChartData } from '@retikz/chart';
import { createScatterChartProviderContribution } from '@retikz/chart/point';
import type { ThemeMode } from '@retikz/core';
import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { compileToScene, scene, scope, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it, vi } from 'vitest';

import { renderChartAsync } from '../src';
import { scatterChart, normalizeScatterChart } from '../src/point';

describe('Chart 异步数据准备', () => {
  it('明暗 Scope 生成不同的图表外观，使用相同的变换数据和分面结果', async () => {
    const rows = [
      { x: 1, y: 2, region: 'east' },
      { x: 2, y: 4, region: 'west' },
    ];
    const props = {
      plotExtension: {
        transform: [{ operation: { kind: 'normalize' as const, params: { field: 'y', as: 'ratio' } } }],
      },
      encodings: { x: 'x', y: 'ratio', row: 'region' },
    };
    const spec = normalizeScatterChart({ ...props, data: { reference: 'rows' } });
    const task = await prepareChartData(
      spec,
      { dataBindings: { rows: { kind: 'rows', rows } } },
      createScatterChartProviderContribution(),
    );
    const prepared = await task.execute();
    const run = (mode: ThemeMode) => {
      const child = scatterChart({ ...props, dataRef: 'rows', preparedData: prepared });
      const result = compileToScene(scene({ children: [scope({ theme: { mode } }, [child])] }));
      return renderToSvgString(result.compileResult.scene).toLowerCase();
    };
    const light = run('light');
    const dark = run('dark');
    expect(prepared).toMatchObject({
      root: { rows: expect.any(Array) },
      panels: [expect.any(Array), expect.any(Array)],
    });
    expect(light).toContain('#ffffff');
    expect(dark).toContain('#09090b');
  });

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
    const rows = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ];
    const spec = normalizeScatterChart({
      data: { reference: 'rows' },
      dataExecution: { mode: 'external', external: 'fixture' },
      title: 'Prepared chart',
      plotExtension: { transform: [{ operation: { kind: 'normalize', params: { field: 'y', as: 'ratio' } } }] },
      encodings: {
        x: 'x',
        y: 'ratio',
      },
    });
    const result = await renderChartAsync(spec, {
      dataBindings: { rows: { kind: 'rows', rows } },
      chartProviderContribution: createScatterChartProviderContribution(),
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
      panel: { position: [24, 12], transforms: [{ kind: 'scale', x: 0.5 }], zIndex: 3 },
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
    const options = {
      chartProviderContribution: createScatterChartProviderContribution(),
      dataBindings: {
        'chart.data': {
          kind: 'result' as const,
          result: {
            rows: [{ x: 1, y: 2 }],
            model: [
              { name: 'x', type: 'continuous' as const },
              { name: 'y', type: 'continuous' as const },
            ],
          },
        },
      },
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
    };
    const input = normalizeScatterChart({
      data: { reference: 'chart.data' },
      dataExecution: { mode: 'external', external: 'fixture' },
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
    const result = await renderChartAsync(input, options);

    expect(result.svg.match(/<ellipse/g)).toHaveLength(1);
    expect(external).not.toHaveBeenCalled();

    const inherited = normalizeScatterChart({
      data: input.data,
      dataExecution: input.dataExecution,
      encodings: { x: 'x', y: { aggregate: { kind: 'mean', field: 'y', as: 'meanY' } } },
    });

    await expect(renderChartAsync(inherited, options)).rejects.toThrow(/unsupported fixture/);
    expect(external).toHaveBeenCalledWith('summarize');
  });
});
