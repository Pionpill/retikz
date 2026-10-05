import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { DataTransformImplementationProvider, DataTransformModel, DataTransformStageInput } from '../../src';
import {
  createDataTransformExecutor,
  DataTransformDeclarationSchema,
  executeDataTransforms,
  resolveDataTransforms,
  defineStatisticsReducer,
  defineStatisticsReducerImplementation,
  defineRowSelector,
  defineRowSelectorImplementation,
  defineRegression,
  defineRegressionImplementation,
  resolveStatisticsReducerRegistry,
  resolveRowSelectorRegistry,
  resolveRegressionRegistry,
  defineTransform,
  defineTransformImplementation,
  resolveTransformRegistry,
  RetikzDataError,
  tagSourceIndex,
  readSourceIndices,
} from '../../src';

const model: DataTransformModel = [{ name: 'value', type: 'continuous' }];

const input = (values: Array<number>): DataTransformStageInput<never> => ({
  kind: 'result',
  result: { rows: values.map(value => ({ value })), model },
});

it('resolves custom semantics without computation and rejects mismatched local or external Definition identities', async () => {
  const semantic = () =>
    defineTransform({
      schema: strictObject({ kind: literal('derive-value'), field: string().default('value') }),
      inputFields: operation => [operation.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: 'derived', type: { from: operation.field } }],
      }),
    });
  const definition = semantic();
  const differentDefinition = semantic();
  const resolution = resolveDataTransforms(
    [{ operation: { kind: 'derive-value' } }, { operation: { kind: 'sort', field: 'derived' } }],
    model,
    { transformRegistry: resolveTransformRegistry([definition]) },
  );

  expect(resolution.stages[0].operation).toEqual({ kind: 'derive-value', field: 'value' });
  expect(resolution.stages[1].outputModel).toEqual([...model, { name: 'derived', type: 'continuous' }]);

  let computed = 0;
  const mismatched = defineTransformImplementation({
    definition: differentDefinition,
    apply: rows => {
      computed++;
      return rows;
    },
  });

  await expect(
    createDataTransformExecutor({ transformImplementations: [mismatched] }).prepare(
      { kind: 'result', model },
      resolution,
    ),
  ).rejects.toThrow(/different Definition/);

  const unsupported = await createDataTransformExecutor().prepare({ kind: 'result', model }, resolution);

  expect(unsupported.kind).toBe('unsupported');

  const external = createDataTransformExecutor({
    dataExecution: { mode: 'external', external: 'fixture' },
    externalProviders: [
      {
        name: 'fixture',
        provider: {
          resolve: () => ({
            kind: 'supported',
            implementation: {
              definition: differentDefinition,
              execute: () => {
                computed++;
                return { rows: [], model };
              },
            },
          }),
        },
      },
    ],
  });

  await expect(external.prepare({ kind: 'result', model }, resolution)).rejects.toThrow(
    /different semantic Definition/,
  );
  expect(computed).toBe(0);
});

it('routes only the named provider and rejects duplicate or missing registrations before execution', async () => {
  const queried: Array<string> = [];
  const provider = (name: string): DataTransformImplementationProvider<never> => ({
    resolve: () => {
      queried.push(name);
      return { kind: 'unsupported', diagnostics: [{ code: 'UNSUPPORTED', message: name }] };
    },
  });
  const a = provider('a');
  const b = provider('b');

  expect(() =>
    createDataTransformExecutor({
      externalProviders: [
        { name: 'a', provider: a },
        { name: 'a', provider: b },
      ],
    }),
  ).toThrow(/duplicate/);

  const executor = createDataTransformExecutor({
    externalProviders: [
      { name: 'a', provider: a },
      { name: 'b', provider: b },
    ],
  });
  const resolution = resolveDataTransforms(
    [{ operation: { kind: 'sort', field: 'value' }, dataExecution: { mode: 'external', external: 'b' } }],
    model,
  );

  await expect(executeDataTransforms(input([2, 1]), resolution, executor)).rejects.toThrow('b');
  expect(queried).toEqual(['b']);

  for (const mode of ['external', 'hybrid'] as const) {
    const missing = resolveDataTransforms(
      [{ operation: { kind: 'sort', field: 'value' }, dataExecution: { mode } }],
      model,
    );

    await expect(executeDataTransforms(input([2, 1]), missing, executor)).rejects.toThrow(/not registered/);
  }

  expect(queried).toEqual(['b']);
});

it('checks actual native capabilities and provenance requirements without using category order as row order', async () => {
  const nativeModel: DataTransformModel = [{ name: 'label', type: 'categorical', order: ['a', 'b'] }];
  type Native = { stableRows: boolean; provenance: boolean };
  let computed = 0;
  const provider: DataTransformImplementationProvider<Native> = {
    resolve: (stage, context) => {
      if (
        context.input.kind !== 'source' ||
        !context.input.source.stableRows ||
        (context.requirements.preserveProvenance && !context.input.source.provenance)
      ) {
        return {
          kind: 'unsupported',
          diagnostics: [{ code: 'CAPABILITY', message: 'stable rows and requested provenance required' }],
        };
      }

      return {
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: () => {
            computed++;
            return { rows: [], model: stage.outputModel };
          },
        },
      };
    },
  };
  const executor = createDataTransformExecutor({ externalProviders: [{ name: 'native', provider }] });
  const resolution = resolveDataTransforms(
    [{ operation: { kind: 'sort', field: 'label' }, dataExecution: { mode: 'external', external: 'native' } }],
    nativeModel,
  );
  const unordered: Native = { stableRows: false, provenance: true };
  const ordered: Native = { stableRows: true, provenance: false };

  expect((await executor.prepare({ kind: 'source', source: unordered, model: nativeModel }, resolution)).kind).toBe(
    'unsupported',
  );
  expect(
    (await executor.prepare({ kind: 'source', source: ordered, model: nativeModel }, resolution, { provenance: true }))
      .kind,
  ).toBe('unsupported');
  expect(computed).toBe(0);

  const result = await executeDataTransforms(
    { kind: 'source', source: ordered, model: nativeModel },
    resolution,
    executor,
  );

  expect(result.model).toEqual(nativeModel);
  expect(computed).toBe(1);
});

describe('data execution policy and binding', () => {
  it('preserves independent operation parameters and sparse execution configuration', () => {
    const declaration = {
      operation: { kind: 'custom', dataExecution: { algorithm: 'fast' } },
      dataExecution: { external: 'worker' },
    };

    expect(DataTransformDeclarationSchema.parse(JSON.parse(JSON.stringify(declaration)))).toEqual(declaration);
  });

  it('executes local stages with the resolved output model', async () => {
    const resolution = resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model);

    expect(await executeDataTransforms(input([3, 1, 2]), resolution, createDataTransformExecutor())).toEqual({
      rows: [{ value: 1 }, { value: 2 }, { value: 3 }],
      model,
    });
  });

  it('prepares once by model and binds independent actual partitions without rerouting', async () => {
    let matched = 0;
    const provider: DataTransformImplementationProvider<never> = {
      resolve: stage => {
        matched++;
        return {
          kind: 'supported',
          implementation: {
            definition: stage.definition,
            execute: current => {
              if (current.kind !== 'result') throw new Error('expected result');
              return Promise.resolve({ rows: [...current.result.rows].reverse(), model: stage.outputModel });
            },
          },
        };
      },
    };
    const resolution = resolveDataTransforms(
      [{ operation: { kind: 'sort', field: 'value', order: 'descending' } }],
      model,
    );
    const executor = createDataTransformExecutor({
      dataExecution: { mode: 'external', external: 'worker' },
      externalProviders: [{ name: 'worker', provider }],
    });
    const ready = await executor.prepare({ kind: 'result', model }, resolution);
    if (ready.kind !== 'ready') throw new Error('expected supported plan');

    const first = ready.bind(input([1, 2]));
    const second = ready.bind(input([3, 4]));

    expect((await first.execute()).rows).toEqual([{ value: 2 }, { value: 1 }]);
    expect((await second.execute()).rows).toEqual([{ value: 4 }, { value: 3 }]);
    expect(matched).toBe(1);
    expect(() => first.execute()).toThrow(/once|consumed/i);
  });

  it('does not execute any stage when external preflight is unsupported', async () => {
    let computed = false;
    const provider: DataTransformImplementationProvider<never> = {
      resolve: (stage, context) =>
        context.operationIndex === 0
          ? {
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: current => {
                  computed = true;
                  if (current.kind !== 'result') throw new Error('expected result');
                  return current.result;
                },
              },
            }
          : { kind: 'unsupported', diagnostics: [{ operationIndex: 1, code: 'NO_SUPPORT', message: 'not supported' }] },
    };
    const resolution = resolveDataTransforms(
      [
        { operation: { kind: 'sort', field: 'value' } },
        { operation: { kind: 'normalize', field: 'value', as: 'ratio' } },
      ],
      model,
    );
    const executor = createDataTransformExecutor({
      dataExecution: { mode: 'external', external: 'worker' },
      externalProviders: [{ name: 'worker', provider }],
    });

    await expect(executeDataTransforms(input([1, 2]), resolution, executor)).rejects.toThrow(/not supported/);
    expect(computed).toBe(false);
  });
});

it('awaits local reducer, selector and regression dependencies before advancing', async () => {
  const calls: Array<string> = [];
  const reducer = defineStatisticsReducer({
    schema: strictObject({ kind: literal('async-sum'), as: string() }),
    outputs: operation => [{ field: operation.as, type: 'continuous' }],
  });
  const reducerImplementation = defineStatisticsReducerImplementation({
    definition: reducer,
    reduce: async (rows, operation) => {
      await Promise.resolve();
      calls.push('reduce');
      return { [operation.as]: rows.reduce((sum, row) => sum + Number(row.value), 0) };
    },
  });
  const selector = defineRowSelector({ schema: strictObject({ kind: literal('async-first') }) });
  const selectorImplementation = defineRowSelectorImplementation({
    definition: selector,
    select: async rows => {
      await Promise.resolve();
      calls.push('select');
      return [{ row: rows[0] }];
    },
  });
  const regression = defineRegression({ schema: strictObject({ kind: literal('async-fit') }) });
  const regressionImplementation = defineRegressionImplementation({
    definition: regression,
    fit: async () => {
      await Promise.resolve();
      calls.push('fit');
      return { predict: (x: number) => x * 2 };
    },
  });
  const executor = createDataTransformExecutor({
    statisticsReducerImplementations: [reducerImplementation],
    rowSelectorImplementations: [selectorImplementation],
    regressionImplementations: [regressionImplementation],
  });
  const resolution = resolveDataTransforms(
    [
      { operation: { kind: 'annotate', metrics: [{ kind: 'async-sum', as: 'total' }] } },
      { operation: { kind: 'select', selector: { kind: 'async-first' } } },
      {
        operation: {
          kind: 'smooth',
          x: 'value',
          y: 'total',
          xAs: 'x',
          yAs: 'y',
          extent: [0, 2],
          sampleCount: 2,
          method: { kind: 'async-fit' },
        },
      },
    ],
    model,
    {
      statisticsReducerRegistry: resolveStatisticsReducerRegistry([reducer]),
      rowSelectorRegistry: resolveRowSelectorRegistry([selector]),
      regressionRegistry: resolveRegressionRegistry([regression]),
    },
  );

  expect((await executeDataTransforms(input([1, 2]), resolution, executor)).rows).toEqual([
    { x: 0, y: 0 },
    { x: 2, y: 4 },
  ]);
  expect(calls).toEqual(['reduce', 'select', 'fit']);
});

it('keeps builtin defaults even with registered external providers, and inherits fields independently', async () => {
  let queried = 0;
  const provider: DataTransformImplementationProvider<never> = {
    resolve: () => {
      queried++;
      return { kind: 'unsupported', diagnostics: [{ code: 'UNSUPPORTED', message: 'unsupported' }] };
    },
  };
  const executor = createDataTransformExecutor({
    dataExecution: { external: 'worker' },
    externalProviders: [{ name: 'worker', provider }],
  });
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model);
  await executeDataTransforms(input([2, 1]), resolution, executor);

  expect(queried).toBe(0);

  await executeDataTransforms(input([2, 1]), resolution, executor, { dataExecution: { mode: 'hybrid' } });

  expect(queried).toBe(1);

  const override = resolveDataTransforms(
    [{ operation: { kind: 'sort', field: 'value' }, dataExecution: { mode: 'builtin' } }],
    model,
  );
  await executeDataTransforms(input([2, 1]), override, executor, {
    dataExecution: { mode: 'external', external: 'missing' },
  });

  expect(queried).toBe(1);
  await expect(
    executeDataTransforms(input([2, 1]), resolution, executor, {
      dataExecution: { mode: 'hybrid', external: 'missing' },
    }),
  ).rejects.toThrow(/not registered/);
});

it('does not turn provider exceptions, rejections, cancellation or invalid results into hybrid fallback', async () => {
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model);
  const cause = new Error('remote failed');
  const provider: DataTransformImplementationProvider<never> = {
    resolve: stage => ({
      kind: 'supported',
      implementation: { definition: stage.definition, execute: () => Promise.reject(cause) },
    }),
  };
  const executor = createDataTransformExecutor({
    dataExecution: { mode: 'hybrid', external: 'worker' },
    externalProviders: [{ name: 'worker', provider }],
  });

  await expect(executeDataTransforms(input([2, 1]), resolution, executor)).rejects.toMatchObject({
    cause,
    details: { operationIndex: 0 },
  });

  const query = createDataTransformExecutor({
    dataExecution: { mode: 'hybrid', external: 'worker' },
    externalProviders: [
      {
        name: 'worker',
        provider: {
          resolve: () => {
            throw cause;
          },
        },
      },
    ],
  });

  await expect(executeDataTransforms(input([2, 1]), resolution, query)).rejects.toMatchObject({ cause });

  const invalid = createDataTransformExecutor({
    dataExecution: { mode: 'hybrid', external: 'worker' },
    externalProviders: [
      {
        name: 'worker',
        provider: {
          resolve: stage => ({
            kind: 'supported',
            implementation: { definition: stage.definition, execute: () => ({ rows: [], model: [] }) },
          }),
        },
      },
    ],
  });

  await expect(executeDataTransforms(input([2, 1]), resolution, invalid)).rejects.toThrow(/model/);

  const abort = new AbortController();
  abort.abort(cause);

  await expect(
    executeDataTransforms(input([2, 1]), resolution, executor, { signal: abort.signal }),
  ).rejects.toBeInstanceOf(RetikzDataError);
});

it('rejects model/source drift during binding and consumes execution rights while still awaiting', async () => {
  let finish: ((result: { rows: Array<{ value: number }>; model: DataTransformModel }) => void) | undefined;
  let executions = 0;
  const provider: DataTransformImplementationProvider<never> = {
    resolve: stage => ({
      kind: 'supported',
      implementation: {
        definition: stage.definition,
        execute: () => {
          executions++;
          return new Promise(resolve => {
            finish = resolve;
          });
        },
      },
    }),
  };
  const executor = createDataTransformExecutor({
    dataExecution: { mode: 'external', external: 'worker' },
    externalProviders: [{ name: 'worker', provider }],
  });
  const ready = await executor.prepare(
    { kind: 'result', model },
    resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model),
  );
  if (ready.kind !== 'ready') throw new Error('expected ready');

  expect(() => ready.bind({ kind: 'result', result: { rows: [], model: [{ name: 'other' }] } })).toThrow(/model/);
  expect(() => ready.bind({ kind: 'result', result: { rows: tagSourceIndex([{ value: 1 }]), model } })).toThrow(
    /provenance/,
  );

  const execution = ready.bind(input([1]));
  const pending = execution.execute();

  expect(() => execution.execute()).toThrow(/consumed/);

  finish?.({ rows: [{ value: 1 }], model });
  await pending;

  expect(executions).toBe(1);
});

it('does not materialize native sources until all stages support the request', async () => {
  const source = { name: 'database' };
  let materialized = 0;
  const executor = createDataTransformExecutor<typeof source>({
    materializeSource: () => {
      materialized++;
      return { rows: [{ value: 2 }, { value: 1 }], model };
    },
  });
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model);
  const ready = await executor.prepare({ kind: 'source', source, model }, resolution);

  expect(materialized).toBe(0);

  if (ready.kind !== 'ready') throw new Error('expected ready');

  expect(() => ready.bind({ kind: 'source', source: { name: 'other' }, model })).toThrow(/descriptor/);
  expect((await ready.bind({ kind: 'source', source, model }).execute()).rows).toEqual([{ value: 1 }, { value: 2 }]);
  expect(materialized).toBe(1);

  const missing = createDataTransformExecutor<typeof source>();

  expect((await missing.prepare({ kind: 'source', source, model }, resolveDataTransforms([], model))).kind).toBe(
    'unsupported',
  );
});

it('preserves actual group provenance and records lineage once under explicit sampling limits', async () => {
  const rows = tagSourceIndex([
    { value: 1, secret: 'a' },
    { value: 3, secret: 'b' },
  ]);
  const resolution = resolveDataTransforms(
    [{ operation: { kind: 'summarize', metrics: [{ kind: 'sum', field: 'value', as: 'total' }] } }],
    model,
  );
  const result = await executeDataTransforms(
    { kind: 'result', result: { rows, model } },
    resolution,
    createDataTransformExecutor(),
    { lineage: { reducerOperations: true, rowSamples: { maxRows: 1, fields: ['value'] } } },
  );

  expect(readSourceIndices(result.rows[0])).toEqual([0, 1]);
  expect(result.lineage?.events.filter(event => event.kind === 'source')).toHaveLength(1);
  expect(result.lineage?.events.filter(event => event.kind === 'transformStep')).toHaveLength(1);
  expect(result.lineage?.events.filter(event => event.kind === 'reducerOperation')).toHaveLength(1);
  expect(result.lineage?.events.find(event => event.kind === 'rowSample')).toMatchObject({ rows: [{ value: 1 }] });
});

it('wraps empty-plan materializer errors and stops local computation after materializer cancellation', async () => {
  const source = { name: 'warehouse' };
  const cause = new Error('materializer failed');
  const failure = createDataTransformExecutor<typeof source>({ materializeSource: () => Promise.reject(cause) });

  await expect(
    executeDataTransforms({ kind: 'source', source, model }, resolveDataTransforms([], model), failure),
  ).rejects.toMatchObject({ code: 'DATA_ERROR', cause });

  const abort = new AbortController();
  let read = 0;
  const cancelled = createDataTransformExecutor<typeof source>({
    materializeSource: () => {
      abort.abort(cause);
      return {
        rows: [
          {
            get value() {
              read++;
              return 1;
            },
          },
        ],
        model,
      };
    },
  });

  await expect(
    executeDataTransforms(
      { kind: 'source', source, model },
      resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model),
      cancelled,
      { signal: abort.signal },
    ),
  ).rejects.toBeInstanceOf(RetikzDataError);
  expect(read).toBe(0);
});

it('retains the upstream history supplied by an explicitly materialized source', async () => {
  const source = { name: 'warehouse' };
  const lineage = { events: [{ kind: 'source' as const, rowCount: 2 }] };
  const executor = createDataTransformExecutor<typeof source>({
    materializeSource: () => ({
      rows: [{ value: 2 }, { value: 1 }],
      model,
      lineage,
    }),
  });
  const result = await executeDataTransforms(
    { kind: 'source', source, model },
    resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model),
    executor,
  );

  expect(result.rows).toEqual([{ value: 1 }, { value: 2 }]);
  expect(result.lineage).toEqual(lineage);
});

it('does not treat lineage summaries as row-level provenance evidence', async () => {
  const executor = createDataTransformExecutor({
    dataExecution: { mode: 'external', external: 'engine' },
    externalProviders: [
      {
        name: 'engine',
        provider: {
          resolve: (stage, context) => {
            expect(context.requirements.preserveProvenance).toBe(false);
            return {
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: current => {
                  if (current.kind !== 'result') throw new Error('expected result');
                  return current.result;
                },
              },
            };
          },
        },
      },
    ],
  });
  const lineage = {
    events: [
      {
        kind: 'source' as const,
        rowCount: 1,
        sourceIdentity: { mode: 'summary' as const, count: 1, indices: [5], truncated: false },
      },
    ],
  };
  const result = await executeDataTransforms(
    { kind: 'result', result: { rows: [{ value: 1 }], model, lineage } },
    resolveDataTransforms([{ operation: { kind: 'sort', field: 'value' } }], model),
    executor,
  );

  expect(result.lineage).toEqual(lineage);
});
