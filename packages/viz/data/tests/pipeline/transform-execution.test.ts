import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { DataTransformImplementationProvider, DataTransformModel, DataTransformStageInput } from '../../src';
import {
  createDataTransformExecutor,
  createDataLineageRecorder,
  applyTransformsToDataView,
  createDataView,
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

it.each([true, false])('将已解决的 lineage=%s 要求传递给外部提供者', async enabled => {
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);
  const executor = createDataTransformExecutor({
    dataExecution: { mode: 'external', external: 'engine' },
    externalProviders: [
      {
        name: 'engine',
        provider: {
          resolve: (stage, context) => {
            expect(context.requirements.lineage).toEqual(enabled ? {} : undefined);
            return {
              kind: 'supported',
              implementation: {
                definition: stage.definition,
                execute: current => {
                  if (current.kind !== 'result') throw new Error('expected result input');
                  const rows = [...current.result.rows].sort((left, right) => Number(left.value) - Number(right.value));
                  const lineage =
                    context.requirements.lineage === undefined
                      ? undefined
                      : createDataLineageRecorder(context.requirements.lineage);
                  lineage?.recordTransformStep({
                    operationIndex: context.operationIndex,
                    operation: stage.operation,
                    inputRows: current.result.rows,
                    outputRows: rows,
                    inputFields: ['value'],
                    outputFields: [],
                  });
                  return { rows, model, ...(lineage === undefined ? {} : { lineage: { events: lineage.events } }) };
                },
              },
            };
          },
        },
      },
    ],
  });
  const result = await executeDataTransforms(input([2, 1]), resolution, executor, { lineage: enabled });
  expect(result.rows).toEqual([{ value: 1 }, { value: 2 }]);
  if (enabled) {
    expect(result.lineage?.events.map(event => event.kind)).toEqual(['source', 'transformStep']);
    expect(result.lineage?.events[0]).toMatchObject({ sourceIdentity: { count: 0, indices: [] } });
  } else expect(result.lineage).toBeUndefined();
});

it.each([true, false])('使用 lineage=%s 作为本地结果输入和空计划', async enabled => {
  for (const declarations of [[], [{ operation: { kind: 'sort', params: { field: 'value' } } }]]) {
    const result = await executeDataTransforms(
      input([2, 1]),
      resolveDataTransforms(declarations, model),
      createDataTransformExecutor(),
      { lineage: enabled },
    );
    expect(result.rows.map(row => row.value)).toEqual(declarations.length === 0 ? [2, 1] : [1, 2]);
    if (enabled)
      expect(result.lineage?.events.map(event => event.kind)).toEqual(
        declarations.length === 0 ? ['source'] : ['source', 'transformStep'],
      );
    else expect(result.lineage).toBeUndefined();
  }
});

it.each([true, false])('使用 lineage=%s 来实现具体化源输入和空计划', async enabled => {
  const source = { name: 'warehouse' };
  const executor = createDataTransformExecutor<typeof source>({
    materializeSource: (_source, _model, context) => {
      expect(context.requirements.lineage).toEqual(enabled ? {} : undefined);
      return { rows: [{ value: 2 }, { value: 1 }], model };
    },
  });
  for (const declarations of [[], [{ operation: { kind: 'sort', params: { field: 'value' } } }]]) {
    const result = await executeDataTransforms(
      { kind: 'source', source, model },
      resolveDataTransforms(declarations, model),
      executor,
      { lineage: enabled },
    );
    expect(result.rows.map(row => row.value)).toEqual(declarations.length === 0 ? [2, 1] : [1, 2]);
    if (enabled)
      expect(result.lineage?.events.map(event => event.kind)).toEqual(
        declarations.length === 0 ? ['source'] : ['source', 'transformStep'],
      );
    else expect(result.lineage).toBeUndefined();
  }
});

it.each(['preserve', 'inherit'] as const)('通过空的本地 %s 结果保留精炼的现场证据', async mode => {
  const definition = defineTransform({
    kind: 'copy-field',
    paramsSchema: strictObject({}),
    inputFields: () => ['value'],
    outputModel: () => ({ kind: 'replace', fields: [{ field: 'copy', type: { from: 'value' } }] }),
  });
  const implementation = defineTransformImplementation({
    definition,
    apply: rows => rows.map(row => ({ copy: row.value })),
  });
  const unknownModel: DataTransformModel = [{ name: 'value' }];
  const resolution = resolveDataTransforms(
    [
      {
        operation: { kind: 'sort', params: { field: 'value' } },
        dataExecution: { mode: 'external', external: 'typed' },
      },
      {
        operation:
          mode === 'preserve' ? { kind: 'sort', params: { field: 'value' } } : { kind: 'copy-field', params: {} },
      },
    ],
    unknownModel,
    { transformRegistry: resolveTransformRegistry([definition]) },
  );
  const executor = createDataTransformExecutor({
    transformImplementations: [implementation],
    externalProviders: [
      {
        name: 'typed',
        provider: {
          resolve: stage => ({
            kind: 'supported',
            implementation: {
              definition: stage.definition,
              execute: () => ({ rows: [], model: [{ name: 'value', type: 'temporal' }] }),
            },
          }),
        },
      },
    ],
  });

  const result = await executeDataTransforms(
    { kind: 'result', result: { rows: [], model: unknownModel } },
    resolution,
    executor,
  );

  expect(result.rows).toEqual([]);
  expect(result.model).toEqual([{ name: mode === 'preserve' ? 'value' : 'copy', type: 'temporal' }]);
  expect(resolution.stages[1].outputModel).toEqual([{ name: mode === 'preserve' ? 'value' : 'copy' }]);
});

it('无需计算即可解析自定义语义，并拒绝不匹配的本地或外部 Definition 身份', async () => {
  const semantic = () =>
    defineTransform({
      kind: 'derive-value',
      paramsSchema: strictObject({ field: string().default('value') }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: 'derived', type: { from: operation.params.field } }],
      }),
    });
  const definition = semantic();
  const differentDefinition = semantic();
  const resolution = resolveDataTransforms(
    [
      { operation: { kind: 'derive-value', params: {} } },
      { operation: { kind: 'sort', params: { field: 'derived' } } },
    ],
    model,
    { transformRegistry: resolveTransformRegistry([definition]) },
  );

  expect(resolution.stages[0].operation).toEqual({ kind: 'derive-value', params: { field: 'value' } });
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

it('仅路由指定的提供者，并在执行前拒绝重复或缺失的注册', async () => {
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
    [{ operation: { kind: 'sort', params: { field: 'value' } }, dataExecution: { mode: 'external', external: 'b' } }],
    model,
  );

  await expect(executeDataTransforms(input([2, 1]), resolution, executor)).rejects.toThrow('b');
  expect(queried).toEqual(['b']);

  for (const mode of ['external', 'hybrid'] as const) {
    const missing = resolveDataTransforms(
      [{ operation: { kind: 'sort', params: { field: 'value' } }, dataExecution: { mode } }],
      model,
    );

    await expect(executeDataTransforms(input([2, 1]), missing, executor)).rejects.toThrow(/not registered/);
  }

  expect(queried).toEqual(['b']);
});

it('检查实际的本机功能和来源追溯要求，而不使用类别顺序作为行顺序', async () => {
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
    [
      {
        operation: { kind: 'sort', params: { field: 'label' } },
        dataExecution: { mode: 'external', external: 'native' },
      },
    ],
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

describe('数据执行策略和绑定', () => {
  it('保留独立的操作参数和稀疏的执行配置', () => {
    const declaration = {
      operation: { kind: 'custom', params: { dataExecution: { algorithm: 'fast' } } },
      dataExecution: { external: 'worker' },
    };

    expect(DataTransformDeclarationSchema.parse(JSON.parse(JSON.stringify(declaration)))).toEqual(declaration);
  });

  it('使用解析的输出模型执行本地阶段', async () => {
    const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);

    expect(await executeDataTransforms(input([3, 1, 2]), resolution, createDataTransformExecutor())).toEqual({
      rows: [{ value: 1 }, { value: 2 }, { value: 3 }],
      model,
    });
  });

  it('按模型准备一次，绑定独立的实际分区，无需重新路由', async () => {
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
      [{ operation: { kind: 'sort', params: { field: 'value', order: 'descending' } } }],
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

    const { execute } = first;
    const [firstResult, secondResult] = await Promise.all([execute(), second.execute()]);
    expect(firstResult.rows).toEqual([{ value: 2 }, { value: 1 }]);
    expect(secondResult.rows).toEqual([{ value: 4 }, { value: 3 }]);
    expect(matched).toBe(1);
    expect(() => first.execute()).toThrow(/once|consumed/i);
  });

  it('不支持外部预检时不执行任何阶段', async () => {
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
        { operation: { kind: 'sort', params: { field: 'value' } } },
        { operation: { kind: 'normalize', params: { field: 'value', as: 'ratio' } } },
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

it('在前进之前等待本地归约器、选择器和回归依赖项', async () => {
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
      { operation: { kind: 'annotate', params: { metrics: [{ kind: 'async-sum', as: 'total' }] } } },
      { operation: { kind: 'select', params: { selector: { kind: 'async-first' } } } },
      {
        operation: {
          kind: 'smooth',
          params: {
            x: 'value',
            y: 'total',
            xAs: 'x',
            yAs: 'y',
            extent: [0, 2],
            sampleCount: 2,
            method: { kind: 'async-fit' },
          },
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

it('跨一个计划的绑定隔离异步运算符游标和血缘', async () => {
  const sum = defineStatisticsReducer({
    schema: strictObject({ kind: literal('partition-sum') }),
    inputFields: () => ['value'],
    outputs: () => [{ field: 'total', type: 'continuous' }],
  });
  const count = defineStatisticsReducer({
    schema: strictObject({ kind: literal('partition-count') }),
    outputs: () => [{ field: 'size', type: 'continuous' }],
  });
  const executor = createDataTransformExecutor({
    statisticsReducerImplementations: [
      defineStatisticsReducerImplementation({
        definition: sum,
        reduce: async rows => {
          await Promise.resolve();
          return { total: rows.reduce((total, row) => total + Number(row.value), 0) };
        },
      }),
      defineStatisticsReducerImplementation({
        definition: count,
        reduce: async rows => {
          await Promise.resolve();
          return { size: rows.length };
        },
      }),
    ],
  });
  const resolution = resolveDataTransforms(
    [
      {
        operation: { kind: 'annotate', params: { metrics: [{ kind: 'partition-sum' }, { kind: 'partition-count' }] } },
      },
    ],
    model,
    { statisticsReducerRegistry: resolveStatisticsReducerRegistry([sum, count]) },
  );
  const ready = await executor.prepare({ kind: 'result', model }, resolution, { lineage: { reducerOperations: true } });
  if (ready.kind !== 'ready') throw new Error('expected supported plan');

  const [first, second] = await Promise.all([
    ready.bind(input([1, 2])).execute(),
    ready.bind(input([10, 20, 30])).execute(),
  ]);
  expect(first.rows).toEqual([
    { value: 1, total: 3, size: 2 },
    { value: 2, total: 3, size: 2 },
  ]);
  expect(second.rows).toEqual([
    { value: 10, total: 60, size: 3 },
    { value: 20, total: 60, size: 3 },
    { value: 30, total: 60, size: 3 },
  ]);
  expect(first.lineage?.events.filter(event => event.kind === 'reducerOperation')).toHaveLength(2);
  expect(second.lineage?.events.filter(event => event.kind === 'reducerOperation')).toHaveLength(2);
  expect(first.lineage?.events).not.toBe(second.lineage?.events);
});

it('隔离一个执行器上的请求之间的取消和血缘选项', async () => {
  const executor = createDataTransformExecutor();
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);
  const controller = new AbortController();
  const { prepare } = executor;
  const cancelled = await prepare({ kind: 'result', model }, resolution, { signal: controller.signal, lineage: true });
  const tracked = await prepare({ kind: 'result', model }, resolution, { lineage: true });
  const plain = await prepare({ kind: 'result', model }, resolution, { lineage: false });
  if (cancelled.kind !== 'ready' || tracked.kind !== 'ready' || plain.kind !== 'ready')
    throw new Error('expected supported plans');

  const cancelledRun = cancelled.bind(input([3, 1]));
  controller.abort('first request cancelled');
  expect(() => cancelledRun.execute()).toThrow(/cancelled/);
  expect(() => cancelledRun.execute()).toThrow(/consumed/);
  const { bind } = tracked;
  const [trackedResult, plainResult] = await Promise.all([
    bind(input([4, 2])).execute(),
    plain.bind(input([8, 6])).execute(),
  ]);
  expect(trackedResult.rows).toEqual([{ value: 2 }, { value: 4 }]);
  expect(trackedResult.lineage?.events.length).toBeGreaterThan(0);
  expect(plainResult).toEqual({ rows: [{ value: 6 }, { value: 8 }], model });
});

it('即使注册了外部提供者，也保留内置默认值，并独立继承字段', async () => {
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
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);
  await executeDataTransforms(input([2, 1]), resolution, executor);

  expect(queried).toBe(0);

  await executeDataTransforms(input([2, 1]), resolution, executor, { dataExecution: { mode: 'hybrid' } });

  expect(queried).toBe(1);

  const override = resolveDataTransforms(
    [{ operation: { kind: 'sort', params: { field: 'value' } }, dataExecution: { mode: 'builtin' } }],
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

it('不会将提供者异常、拒绝、取消或无效结果转变为混合回退', async () => {
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);
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

  await expect(executeDataTransforms(input([2, 1]), resolution, invalid)).rejects.toMatchObject({
    message: expect.stringMatching(/model/),
    details: { operationIndex: 0 },
  });

  const abort = new AbortController();
  abort.abort(cause);

  await expect(
    executeDataTransforms(input([2, 1]), resolution, executor, { signal: abort.signal }),
  ).rejects.toBeInstanceOf(RetikzDataError);
});

it('在绑定期间拒绝模型/源漂移，并在等待时消费执行权', async () => {
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
    resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model),
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

it('在所有阶段都支持请求之前，不会具体化本机源', async () => {
  const source = { name: 'database' };
  let materialized = 0;
  const executor = createDataTransformExecutor<typeof source>({
    materializeSource: () => {
      materialized++;
      return { rows: [{ value: 2 }, { value: 1 }], model };
    },
  });
  const resolution = resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model);
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

it('在明确的采样限制下保留实际的群体起源并记录血缘', async () => {
  const rows = tagSourceIndex([
    { value: 1, secret: 'a' },
    { value: 3, secret: 'b' },
  ]);
  const resolution = resolveDataTransforms(
    [{ operation: { kind: 'summarize', params: { metrics: [{ kind: 'sum', field: 'value', as: 'total' }] } } }],
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

it('包装空计划物化器错误并在物化器取消后停止本地计算', async () => {
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
      resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model),
      cancelled,
      { signal: abort.signal },
    ),
  ).rejects.toBeInstanceOf(RetikzDataError);
  expect(read).toBe(0);
});

it.each([undefined, false])('当血缘为 %s 时，保留具体化的上游历史记录', async lineageOption => {
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
    resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model),
    executor,
    { lineage: lineageOption },
  );

  expect(result.rows).toEqual([{ value: 1 }, { value: 2 }]);
  expect(result.lineage).toEqual(lineage);
});

it('不将血缘摘要视为行级来源追溯证据', async () => {
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
    resolveDataTransforms([{ operation: { kind: 'sort', params: { field: 'value' } } }], model),
    executor,
  );

  expect(result.lineage).toEqual(lineage);
});

it('使用异步自定义指标和存储聚合入口本地来源执行分层排序和分类', async () => {
  const rows = tagSourceIndex([
    { team: 'B', item: 'x', value: 10 },
    { team: 'A', item: 'x', value: 2 },
    { team: 'B', item: 'y', value: 1 },
    { team: 'B', item: 'x', value: 0 },
  ]);
  const view = createDataView(rows, [
    { name: 'team', type: 'categorical' },
    { name: 'item', type: 'categorical' },
    { name: 'value', type: 'continuous' },
  ]);
  const metric = defineStatisticsReducer({
    schema: strictObject({ kind: literal('bucket-size') }),
    outputs: () => [{ field: 'size', type: 'continuous' }],
  });
  const registry = resolveStatisticsReducerRegistry([metric]);
  const sync = defineStatisticsReducerImplementation({
    definition: metric,
    reduce: members => ({ size: members.length }),
  });
  const calls: Array<Array<number>> = [];
  const asynchronous = defineStatisticsReducerImplementation({
    definition: metric,
    reduce: async members => {
      await Promise.resolve();
      calls.push(members.map(row => Number(row.value)));
      return { size: members.length };
    },
  });
  const declarations: Parameters<typeof resolveDataTransforms>[0] = [
    { operation: { kind: 'sort', params: { field: 'value', groupBy: ['team', 'item'] } } },
    {
      operation: {
        kind: 'bin',
        params: {
          field: 'value',
          groupBy: ['team', 'item'],
          extent: [0, 10],
          count: 2,
          metrics: [{ kind: 'bucket-size' }],
        },
      },
    },
  ];
  const expected = applyTransformsToDataView(
    view,
    declarations.map(declaration => declaration.operation),
    { context: { statisticsReducerRegistry: registry }, statisticsReducerImplementations: [sync] },
  ).dataView;
  const actual = await executeDataTransforms(
    { kind: 'result', result: { rows, model: view.model } },
    resolveDataTransforms(declarations, view.model, { statisticsReducerRegistry: registry }),
    createDataTransformExecutor({ statisticsReducerImplementations: [asynchronous] }),
  );
  expect(actual.rows).toEqual(expected.rows);
  expect(actual.model).toEqual(expected.model);
  expect(actual.rows.map(row => [row.team, row.item])).toEqual([
    ['B', 'x'],
    ['B', 'x'],
    ['B', 'y'],
    ['B', 'y'],
    ['A', 'x'],
    ['A', 'x'],
  ]);
  expect(actual.rows.map(readSourceIndices)).toEqual([[3], [0], [2], undefined, [1], undefined]);
  expect(calls).toEqual([[0], [10], [1], [], [2], []]);
});
