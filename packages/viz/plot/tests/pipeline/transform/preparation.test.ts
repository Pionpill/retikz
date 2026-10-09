import { compileToScene, createCompositeInputBindings } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import { applyTransformsWithLineage, createDataTransformExecutor, readSourceIndex, tagSourceIndex } from '@retikz/data';
import type { DataTransformImplementationProvider } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { lowerPlots, preparePlotData, PlotSchema } from '../../../src';

const specOf = () =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference: 'rows',
      model: [
        { name: 'value', type: 'continuous' },
        { name: 'group', type: 'categorical' },
      ],
    },
    dataExecution: { mode: 'external', external: 'fixture' },
    transform: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'root' } } }],
    scales: [],
    coordinate: { type: 'cartesian2D' },
    marks: [
      {
        type: 'point',
        transform: [{ operation: { kind: 'normalize', params: { field: 'root', as: 'local' } } }],
        encoding: { x: { field: 'local' }, y: { field: 'value' } },
      },
    ],
  });

const rows = [
  { value: 1, group: 'a' },
  { value: 2, group: 'b' },
];

describe('Plot whole-scope data preparation', () => {
  it('consumes nonzero seeded jitter once across repeated compilation', async () => {
    const spec = specOf();
    spec.dataExecution = { mode: 'builtin' };
    spec.transform = [{ operation: { kind: 'jitter', params: { xField: 'value', amount: 0.5, seed: 31 } } }];
    spec.marks[0].transform = [];
    spec.marks[0].encoding = { x: { field: 'value' }, y: { field: 'value' } };
    const plan = await preparePlotData(spec, { dataBindings: { rows: { kind: 'rows', rows } } });
    const prepared = await plan.execute();

    expect(prepared.root.rows.map(row => row.value)).not.toEqual(rows.map(row => row.value));

    const source: IRScene = { type: 'scene', version: 1, children: [spec] };
    const options = {
      composites: lowerPlots({}),
      compositeInputs: createCompositeInputBindings(source, [{ path: ['children', 0], input: prepared }]),
    };
    const first = compileToScene(source, options).scene;

    expect(compileToScene(source, options).scene).toEqual(first);

    const expected = compileToScene(
      { ...source, children: [{ ...spec, transform: [] }] },
      {
        composites: lowerPlots({ rows: prepared.root.rows }),
      },
    ).scene;

    expect(first.primitives).toEqual(expected.primitives);
  });

  it('rebases result provenance to its local dataset while retaining independent upstream lineage', async () => {
    const upstreamRows = tagSourceIndex(
      Array.from({ length: 7 }, (_, index) => ({ value: index + 1, group: 'a' })),
    ).slice(5);
    const lineage = applyTransformsWithLineage(rows).lineage;
    const spec = specOf();
    spec.dataExecution = { mode: 'builtin' };
    spec.transform = [];
    spec.marks[0].transform = [];
    spec.marks[0].encoding = { x: { field: 'value' }, y: { field: 'value' } };
    const plan = await preparePlotData(
      spec,
      {
        dataBindings: { rows: { kind: 'result', result: { rows: upstreamRows, model: spec.data.model!, lineage } } },
      },
      { provenance: true },
    );
    const prepared = await plan.execute();

    expect(prepared.root.rows.map(readSourceIndex)).toEqual([0, 1]);
    expect(upstreamRows.map(readSourceIndex)).toEqual([5, 6]);
    expect(prepared.root.lineage?.events).toEqual(lineage.events);
  });

  it('preflights root and mark templates before computing actual root and facet inputs', async () => {
    const calls: Array<string> = [];
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => {
        calls.push(`prepare:${stage.operation.kind}`);
        return {
          kind: 'supported',
          implementation: {
            definition: stage.definition,
            execute: input => {
              if (input.kind !== 'result') throw new Error('fixture requires result');

              calls.push(`execute:${input.result.rows.length}`);
              const operation = stage.operation.params as { field: string; as: string };

              return {
                rows: input.result.rows.map(row => ({ ...row, [operation.as]: Number(row[operation.field]) + 10 })),
                model: stage.outputModel,
              };
            },
          },
        };
      },
    };
    const spec = specOf();
    spec.composition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      arrangements: [{ kind: 'facet', id: 'groups', view: 'main', column: { field: 'group' } }],
    };
    delete spec.coordinate;
    const plan = await preparePlotData(spec, {
      dataBindings: { rows: { kind: 'rows', rows } },
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
    });

    expect(calls).toEqual(['prepare:normalize', 'prepare:normalize']);

    const prepared = await plan.execute();

    expect(prepared.root.rows.map(row => row.root)).toEqual([11, 12]);
    expect(prepared.panels.map(panel => panel[0].rows.map(row => row.local))).toEqual([[21], [22]]);

    const source: IRScene = { type: 'scene', version: 1, children: [spec] };
    const options = {
      composites: lowerPlots({}),
      compositeInputs: createCompositeInputBindings(source, [{ path: ['children', 0], input: prepared }]),
    };
    compileToScene(source, options);
    compileToScene(source, options);

    expect(calls.filter(call => call.startsWith('execute'))).toEqual([
      'execute:2',
      'execute:2',
      'execute:1',
      'execute:1',
    ]);
    await expect(plan.execute()).rejects.toThrow(/once/i);
  });

  it('rejects an unsupported downstream template before any root computation', async () => {
    let computations = 0;
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage =>
        stage.operation.kind === 'sort'
          ? { kind: 'unsupported', diagnostics: [{ code: 'UNSUPPORTED', message: 'sort unsupported' }] }
          : {
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: () => {
                  computations++;
                  return { rows: [], model: stage.outputModel };
                },
              },
            },
    };
    const spec = specOf();
    spec.marks[0].transform = [{ operation: { kind: 'sort', params: { field: 'root' } } }];
    spec.marks[0].encoding = { x: { field: 'root' }, y: { field: 'value' } };

    await expect(
      preparePlotData(spec, {
        dataBindings: { rows: { kind: 'rows', rows } },
        dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
      }),
    ).rejects.toThrow(/mark.*sort unsupported/i);
    expect(computations).toBe(0);
  });

  it('rejects source parsers on canonical result bindings', async () => {
    const spec = specOf();

    await expect(
      preparePlotData(
        spec,
        {
          dataBindings: {
            rows: {
              kind: 'result',
              result: {
                rows,
                model: [
                  { name: 'value', type: 'continuous' },
                  { name: 'group', type: 'categorical' },
                ],
              },
            },
          },
        },
        { resolveField: () => undefined },
      ),
    ).rejects.toThrow(/canonical|parser/i);
  });
});
