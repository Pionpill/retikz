import { compileToScene, createCompositeInputBindings } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import { applyTransforms, createDataTransformExecutor, readSourceIndex, tagSourceIndex } from '@retikz/data';
import type { DataTransformImplementationProvider } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { lowerPlots, preparePlotData, PlotSchema, MarkSchema } from '../../../src';

const specOf = () => {
  const spec = PlotSchema.parse({
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
        transforms: [{ operation: { kind: 'normalize', params: { field: 'root', as: 'local' } } }],
        kind: 'data',
        encodings: { position: { x: 'local', y: 'value' } },
      },
    ],
  });

  return { ...spec, marks: spec.marks.map(mark => MarkSchema.parse(mark)) };
};

const rows = [
  { value: 1, group: 'a' },
  { value: 2, group: 'b' },
];

describe('Plot whole-scope data preparation', () => {
  it('为根变换使用 hybrid，为普通及 facet 图元使用独立 builtin 策略', async () => {
    const spec = specOf();
    spec.dataExecution = { root: { mode: 'hybrid', external: 'fixture' }, marks: { mode: 'builtin' } };
    spec.composition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      arrangements: [{ kind: 'facet', id: 'groups', view: 'main', column: { field: 'group' } }],
    };
    delete spec.coordinate;
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => ({
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: input => {
            if (input.kind !== 'result') throw new Error('fixture requires result');
            return {
              rows: input.result.rows.map(row => ({ ...row, root: Number(row.value) + 10 })),
              model: stage.outputModel,
            };
          },
        },
      }),
    };
    const preparation = await preparePlotData(spec, {
      dataBindings: { rows: { kind: 'rows', rows } },
      dataTransformExecutor: createDataTransformExecutor({ externalProviders: [{ name: 'fixture', provider }] }),
    });
    const prepared = await preparation.execute();
    expect(prepared.root.rows.map(row => row.root)).toEqual([11, 12]);
    expect(prepared.marks[0]!.rows.map(row => row.local)).toEqual([11 / 23, 12 / 23]);
    expect(prepared.panels.map(panel => panel[0]!.rows.map(row => row.local))).toEqual([[1], [1]]);

    // marks 的 mode 可来自执行器默认值，但不得取得 root 的 provider 名称
    spec.dataExecution = { root: { mode: 'hybrid', external: 'fixture' }, marks: {} };
    await expect(
      preparePlotData(spec, {
        dataBindings: { rows: { kind: 'rows', rows } },
        dataTransformExecutor: createDataTransformExecutor({
          dataExecution: { mode: 'external' },
          externalProviders: [{ name: 'fixture', provider }],
        }),
      }),
    ).rejects.toThrow(/mark/);
  });

  it('稀疏 marks 策略不继承 root 的 external，并允许单条声明覆盖两个作用域', async () => {
    const spec = specOf();
    spec.dataExecution = { root: { mode: 'external', external: 'missing' }, marks: {} };
    spec.transform![0].dataExecution = { mode: 'builtin' };
    const prepared = await (await preparePlotData(spec, { dataBindings: { rows: { kind: 'rows', rows } } })).execute();
    expect(prepared.root.rows.map(row => row.root)).toEqual([1 / 3, 2 / 3]);
    expect(prepared.marks[0]!.rows.map(row => row.local)).toEqual([1 / 3, 2 / 3]);

    spec.marks[0].transforms![0].dataExecution = { mode: 'external', external: 'missing' };
    await expect(preparePlotData(spec, { dataBindings: { rows: { kind: 'rows', rows } } })).rejects.toThrow(/mark/);
  });

  it('同步入口按实际作用域检查策略，并尊重单条 builtin 覆盖', () => {
    const spec = specOf();
    const compile = () =>
      compileToScene({ type: 'scene', version: 1, children: [spec] }, { composites: lowerPlots({ rows }) });
    spec.dataExecution = { root: { mode: 'builtin' }, marks: { mode: 'external', external: 'fixture' } };
    expect(compile).toThrow(/async preparation/);
    spec.marks[0].transforms![0].dataExecution = { mode: 'builtin' };
    expect(compile().scene.primitives.length).toBeGreaterThan(0);
    spec.dataExecution = { root: { mode: 'hybrid', external: 'fixture' }, marks: { mode: 'builtin' } };
    expect(compile).toThrow(/async preparation/);
  });

  it('consumes nonzero seeded jitter once across repeated compilation', async () => {
    const spec = specOf();
    spec.dataExecution = { mode: 'builtin' };
    spec.transform = [{ operation: { kind: 'jitter', params: { xField: 'value', amount: 0.5, seed: 31 } } }];
    spec.marks[0].transforms = [];
    spec.marks[0].encodings = { position: { x: 'value', y: 'value' } };
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
    const lineage = applyTransforms(rows, [], { provenance: true, lineage: {} }).lineage;
    expect(lineage).toBeDefined();
    const spec = specOf();
    spec.dataExecution = { mode: 'builtin' };
    spec.transform = [];
    spec.marks[0].transforms = [];
    spec.marks[0].encodings = { position: { x: 'value', y: 'value' } };
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
    expect(prepared.root.lineage?.events).toEqual(lineage?.events);
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
    expect(prepared.panels.map(panel => panel[0]!.rows.map(row => row.local))).toEqual([[21], [22]]);

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
    spec.marks[0].transforms = [{ operation: { kind: 'sort', params: { field: 'root' } } }];
    spec.marks[0].encodings = { position: { x: 'root', y: 'value' } };

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
