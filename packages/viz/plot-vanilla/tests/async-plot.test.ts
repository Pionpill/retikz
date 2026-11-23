import type { DataTransformImplementationProvider } from '@retikz/data';
import { createDataTransformExecutor } from '@retikz/data';
import { preparePlotData, PlotSchema } from '@retikz/plot';
import { SceneRuntime, embed, compileToScene, scene } from '@retikz/vanilla';
import { describe, expect, it, vi } from 'vitest';

import type { InputPlotEmbed } from '../src';
import { plotInputEmbedAdapter, createPlotLineageCompileResultExtension, renderPlot, renderPlotAsync } from '../src';

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
  it('更新保留的血缘站点，同时保持共享驱动程序实例隔离', () => {
    const first = vi.fn();
    const second = vi.fn();
    const replacement = vi.fn();
    const input = (onLineage: typeof first) =>
      scene({
        children: [
          embed<InputPlotEmbed>({
            adapter: plotInputEmbedAdapter,
            props: { spec: spec(), datasets: { rows }, onLineage, panel: { position: [24, 12], zIndex: 3 } },
          }),
        ],
      });
    const options = { compileResultExtension: createPlotLineageCompileResultExtension() };
    const a = SceneRuntime.fromInput(input(first), options);
    const b = SceneRuntime.fromInput(input(second), options);

    try {
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      a.replace(input(replacement));
      expect(replacement).toHaveBeenCalledOnce();
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      b.replace(input(second));
      expect(second).toHaveBeenCalledTimes(2);
      expect(replacement).toHaveBeenCalledOnce();
    } finally {
      a.dispose();
      b.dispose();
    }
  });

  it('一次性编译完成后独立通知每个血缘回调', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = vi.fn(() => {
      throw new Error('author callback failed');
    });
    const second = vi.fn();
    const input = (onLineage: typeof second) =>
      embed<InputPlotEmbed>({ adapter: plotInputEmbedAdapter, props: { spec: spec(), datasets: { rows }, onLineage } });
    const source = scene({ children: [input(first), input(second)] });
    const options = { compileResultExtension: createPlotLineageCompileResultExtension() };

    try {
      const result = compileToScene(source, options);

      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
      expect(result.scene.primitives).toHaveLength(2);
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

  it('本地行和外部结果按各自的实例路径进入同一帧', async () => {
    const plot = spec();
    const preparation = await preparePlotData(plot, {
      dataBindings: { rows: { kind: 'rows', rows: [{ x: 3, y: 1 }] } },
    });
    const preparedData = await preparation.execute();
    const result = compileToScene(
      scene({
        children: [
          embed<InputPlotEmbed>({ adapter: plotInputEmbedAdapter, props: { spec: plot, datasets: { rows } } }),
          embed<InputPlotEmbed>({
            adapter: plotInputEmbedAdapter,
            props: { spec: plot, preparedData, panel: { position: [24, 12] } },
          }),
        ],
      }),
    );
    expect(JSON.stringify(result.scene).match(/"type":"ellipse"/g)).toHaveLength(3);
  });
});
