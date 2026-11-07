import { createDataTransformExecutor } from '@retikz/data';
import { processToStaticInputResultAsync, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { detailTable, embedTable, renderTable, renderTableAsync, tableInputEmbedAdapter } from '../src';

const table = () =>
  detailTable({
    dataRef: 'rows',
    header: false,
    columns: [{ id: 'ratio', field: 'ratio' }],
    transform: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'ratio' } } }],
  });

describe('异步 Table 编写', () => {
  it('返回相同的 SVG 和提交的清单作为内置同步渲染', async () => {
    const spec = table();
    const rows = [{ value: 2 }, { value: 6 }];
    const expected = renderTable(spec, { data: { rows }, artifacts: true });

    expect(await renderTableAsync(spec, { data: { rows }, artifacts: true })).toEqual(expected);
    expect(await renderTableAsync(spec, { data: { rows } })).toBe(expected.svg);
    expect(expected.svg).toContain('0.75');
  });

  it('渲染不同的匿名原生绑定且每个绑定在探测链路中仅执行一次', async () => {
    let executions = 0;
    const dataTransformExecutor = createDataTransformExecutor<{ values: Array<number> }>({
      dataExecution: { mode: 'external', external: 'native' },
      externalProviders: [
        {
          name: 'native',
          provider: {
            resolve: stage => ({
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: async input => {
                  await Promise.resolve();
                  executions++;
                  if (input.kind !== 'source') throw new Error('native source expected');

                  return {
                    rows: input.source.values.map(value => ({ value, ratio: value / 8 })),
                    model: stage.outputModel,
                  };
                },
              },
            }),
          },
        },
      ],
    });
    const spec = table();
    spec.data.model = [{ name: 'value', type: 'continuous' }];
    const input = (values: Array<number>) =>
      embedTable(spec, { dataBindings: { rows: { kind: 'source', source: { values } } }, dataTransformExecutor });
    const result = await processToStaticInputResultAsync(scene({ children: [input([2, 6]), input([4])] }), {
      adapters: [tableInputEmbedAdapter],
    });
    const svg = renderToSvgString(result.scene);

    expect(svg).toContain('0.25');
    expect(svg).toContain('0.75');
    expect(svg).toContain('0.5');
    expect(executions).toBe(2);
    expect(result.compileResult.artifacts.filter(artifact => artifact.namespace === 'table')).toHaveLength(2);
  });
});
