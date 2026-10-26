import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { PlotSchema } from '@retikz/plot';
import {
  createProcessingControllerAsync,
  embed,
  prepareStaticProcessingAsync,
  processToStaticInputResultAsync,
  scene,
} from '@retikz/vanilla';
import { describe, expect, it, vi } from 'vitest';

import { PlotInputEmbedAdapter, createPlotLineageCompileDriver, renderPlot, renderPlotAsync } from '../src';

const rows = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
];

const spec = () =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    scales: [],
    coordinate: { type: 'cartesian2D' },
    transform: [{ operation: { kind: 'normalize', params: { field: 'y', as: 'ratio' } } }],
    marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'ratio' } } } }],
  });

describe('异步 Plot 编写', () => {
  it('更新保留的血缘站点，同时保持共享驱动程序实例隔离', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const replacement = vi.fn();
    const input = (onLineage: typeof first) =>
      scene({
        children: [
          embed({
            kind: 'plot',
            props: { spec: spec(), datasets: { rows }, onLineage, panel: { position: [24, 12], zIndex: 3 } },
          }),
        ],
      });
    const options = { adapters: [PlotInputEmbedAdapter], compileDriver: createPlotLineageCompileDriver() };
    const a = await createProcessingControllerAsync(input(first), options);
    const b = await createProcessingControllerAsync(input(second), options);

    try {
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect((await a.update(input(replacement))).kind).toBe('committed');
      expect(replacement).toHaveBeenCalledOnce();
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect((await b.update(input(second))).kind).toBe('committed');
      expect(second).toHaveBeenCalledTimes(2);
      expect(replacement).toHaveBeenCalledOnce();
    } finally {
      a.dispose();
      b.dispose();
    }
  });

  it('独立通知已提交的血缘回调，并且从不通知丢弃的候选者', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = vi.fn(() => {
      throw new Error('author callback failed');
    });
    const second = vi.fn();
    const input = (onLineage: typeof second) =>
      embed({ kind: 'plot', props: { spec: spec(), datasets: { rows }, onLineage } });
    const source = scene({ children: [input(first), input(second)] });
    const options = { adapters: [PlotInputEmbedAdapter], compileDriver: createPlotLineageCompileDriver() };

    try {
      const discarded = await prepareStaticProcessingAsync(source, options);
      discarded.discard();

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();

      const committed = await prepareStaticProcessingAsync(source, options);
      committed.commit();

      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect(committed.result.scene.primitives).toHaveLength(2);
    } finally {
      warn.mockRestore();
    }
  });

  it('保留行和规范结果的内置 SVG 等价性', async () => {
    const plot = spec();
    const expected = renderPlot(plot, { rows });

    expect(await renderPlotAsync(plot, { rows: { kind: 'rows', rows } })).toBe(expected);
    expect(
      await renderPlotAsync(plot, {
        rows: {
          kind: 'result',
          result: {
            rows,
            model: [
              { name: 'x', type: 'continuous' },
              { name: 'y', type: 'continuous' },
            ],
          },
        },
      }),
    ).toBe(expected);
  });

  it('即使在编译后渲染血缘时也使用 Promise 执行一次', async () => {
    let executions = 0;
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => ({
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: async input => {
            await Promise.resolve();
            if (input.kind !== 'result') throw new Error('fixture requires canonical result');

            executions++;

            return {
              rows: input.result.rows.map(row => ({ ...row, ratio: Number(row.y) / 6 })),
              model: stage.outputModel,
            };
          },
        },
      }),
    };
    const plot = spec();
    plot.dataExecution = { mode: 'external', external: 'fixture' };
    const result = await renderPlotAsync(
      plot,
      { rows: { kind: 'rows', rows } },
      {
        dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
        lineage: { rowValues: { fields: ['ratio'], maxRows: 2 } },
      },
    );

    expect(result.svg).toContain('<svg');
    expect(JSON.stringify(result.lineage)).toContain('ratio');
    expect(executions).toBe(1);
    expect(() => renderPlot(plot, { rows })).toThrow(/async/i);
  });

  it('在一个准备树中保持相同的匿名 Plot 输入不同', async () => {
    const plot = spec();
    const input = (values: typeof rows) =>
      embed({ kind: 'plot', props: { spec: plot, dataBindings: { rows: { kind: 'rows', rows: values } } } });
    const result = await processToStaticInputResultAsync(scene({ children: [input(rows), input([{ x: 3, y: 1 }])] }), {
      adapters: [PlotInputEmbedAdapter],
    });

    expect(result.scene.primitives).toHaveLength(2);
    expect(JSON.stringify(result.scene).match(/"type":"ellipse"/g)).toHaveLength(3);
    expect(JSON.stringify(result.scene)).not.toContain('dataBindings');
  });
});
