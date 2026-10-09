import { createDataTransformExecutor } from '@retikz/data';
import { processToStaticInputResultAsync, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { TableInputEmbedAdapter, detailTable, embedTable, renderTable, renderTableAsync } from '../src';

const table = () =>
  detailTable({
    dataRef: 'rows',
    header: false,
    columns: [{ id: 'ratio', field: 'ratio' }],
    transform: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'ratio' } } }],
  });

describe('async Table authoring', () => {
  it('returns the same SVG and committed manifest as builtin synchronous rendering', async () => {
    const spec = table();
    const rows = [{ value: 2 }, { value: 6 }];
    const expected = renderTable(spec, { data: { rows }, artifacts: true });

    expect(await renderTableAsync(spec, { data: { rows }, artifacts: true })).toEqual(expected);
    expect(await renderTableAsync(spec, { data: { rows } })).toBe(expected.svg);
    expect(expected.svg).toContain('0.75');
  });

  it('renders distinct anonymous native bindings and executes each only once through probes', async () => {
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
      adapters: [TableInputEmbedAdapter],
    });
    const svg = renderToSvgString(result.scene);

    expect(svg).toContain('0.25');
    expect(svg).toContain('0.75');
    expect(svg).toContain('0.5');
    expect(executions).toBe(2);
    expect(
      result.compileResult.artifacts.filter(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'table',
      ),
    ).toHaveLength(2);
  });
});
