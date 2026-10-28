import { createDataTransformExecutor } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { TableSchema, prepareTableData, resolveTableData } from '../../src';
import { resolveTableStructure } from '../../src/pipeline/structure';

const detail = (transform = true) =>
  TableSchema.parse({
    namespace: 'table',
    type: 'table',
    data: { reference: 'rows' },
    structure: { kind: 'detail', header: false, columns: [{ id: 'value', field: transform ? 'ratio' : 'value' }] },
    ...(transform
      ? { transform: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'ratio' } } }] }
      : {}),
  });

describe('Table 数据准备', () => {
  it('在结构解析之前进行转换并保留同步/异步值和模型', async () => {
    const spec = detail();
    const rows = [{ value: 2 }, { value: 6 }];
    const synchronous = resolveTableData(spec, { rows });
    const preparation = await prepareTableData(spec, { dataBindings: { rows: { kind: 'rows', rows } } });
    const preparedData = await preparation.execute();

    expect(preparedData).toEqual(synchronous);

    const structure = resolveTableStructure(spec.structure, { data: spec.data, preparedData });

    expect(structure.cells.map(cell => cell.payload)).toEqual([
      { kind: 'value', value: 0.25 },
      { kind: 'value', value: 0.75 },
    ]);
    expect(preparedData?.model).toContainEqual({ name: 'ratio', type: 'continuous' });
    await expect(preparation.execute()).rejects.toThrow(/only once/);
  });

  it('保持未转换的布尔值、null 和类似日期的值与原始 Table 结构相同', async () => {
    const spec = detail(false);
    const rows = [{ value: false }, { value: null }, { value: '2026-10-03' }];
    const preparation = await prepareTableData(spec, { dataBindings: { rows: { kind: 'rows', rows } } });
    const preparedData = await preparation.execute();
    const expected = resolveTableStructure(spec.structure, { data: spec.data, datasets: { rows } });

    expect(resolveTableStructure(spec.structure, { data: spec.data, preparedData })).toEqual(expected);
  });

  it('通过转换保留格式隐含的时间类型', async () => {
    const spec = TableSchema.parse({
      ...detail(false),
      data: { reference: 'rows', model: [{ name: 'value', format: 'iso' }] },
      transform: [{ operation: { kind: 'sort', params: { field: 'value' } } }],
    });
    const preparation = await prepareTableData(spec, {
      dataBindings: { rows: { kind: 'rows', rows: [{ value: '2026-10-03' }] } },
    });
    const result = await preparation.execute();

    expect(result?.model).toEqual([{ name: 'value', type: 'temporal' }]);
    expect(result?.rows[0].value).toBe(Date.UTC(2026, 9, 3));
  });

  it('拒绝手动申报和计算前未绑定的自定义', async () => {
    expect(
      TableSchema.safeParse({
        namespace: 'table',
        type: 'table',
        structure: { kind: 'manual', rows: [] },
        transform: [],
      }).success,
    ).toBe(false);

    const custom = TableSchema.parse({
      namespace: 'table',
      type: 'table',
      structure: { kind: 'summary' },
      transform: [],
    });

    await expect(prepareTableData(custom, { dataBindings: {} })).rejects.toThrow(/bound dataset/);
  });

  it('使用本机 Promise 结果，而不提升额外的有效负载字段', async () => {
    const spec = TableSchema.parse({
      ...detail(),
      data: { reference: 'rows', model: [{ name: 'value', type: 'continuous' }] },
      dataExecution: { mode: 'external', external: 'native' },
    });
    let calls = 0;
    const executor = createDataTransformExecutor<{ values: Array<number> }>({
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
                  calls++;
                  if (input.kind !== 'source') throw new Error('native source expected');

                  return {
                    rows: input.source.values.map(value => ({ value, ratio: value / 8, extra: 'payload' })),
                    model: stage.outputModel,
                  };
                },
              },
            }),
          },
        },
      ],
    });
    const preparation = await prepareTableData(spec, {
      dataBindings: { rows: { kind: 'source', source: { values: [2, 6] } } },
      dataTransformExecutor: executor,
    });
    const result = await preparation.execute();

    expect(result?.rows.map(row => row.ratio)).toEqual([0.25, 0.75]);
    expect(result?.model.map(field => field.name)).toEqual(['value', 'ratio']);
    expect(calls).toBe(1);
    expect(() => resolveTableData(spec, { rows: [{ value: 2 }] })).toThrow(/async processing/);
  });

  it('拒绝规范绑定上的本机模型省略和源解析器', async () => {
    await expect(
      prepareTableData(detail(), { dataBindings: { rows: { kind: 'source', source: {} } } }),
    ).rejects.toThrow(/complete data.model/);

    const spec = TableSchema.parse({
      ...detail(false),
      data: { reference: 'rows', model: [{ name: 'value', format: 'iso' }] },
    });

    await expect(
      prepareTableData(spec, {
        dataBindings: { rows: { kind: 'result', result: { rows: [], model: [{ name: 'value', type: 'temporal' }] } } },
      }),
    ).rejects.toThrow(/source formats/);
  });

  it('保留未知的空字段并拒绝规范模型之外的结构字段', async () => {
    const spec = detail(false);
    const preparation = await prepareTableData(spec, {
      dataBindings: {
        rows: {
          kind: 'result',
          result: { rows: [{ value: 2, extra: 3 }], model: [{ name: 'value', type: 'continuous' }] },
        },
      },
    });
    const preparedData = await preparation.execute();

    expect(() =>
      resolveTableStructure(
        { kind: 'detail', header: false, columns: [{ id: 'extra', field: 'extra' }] },
        { data: spec.data, preparedData },
      ),
    ).toThrow(/unknown field.*extra/);

    const empty = await prepareTableData(
      TableSchema.parse({ ...spec, data: { reference: 'rows', model: [{ name: 'value' }] }, transform: [] }),
      { dataBindings: { rows: { kind: 'rows', rows: [] } } },
    );

    expect((await empty.execute())?.model).toEqual([{ name: 'value' }]);
  });
});

describe('Table 类别顺序接入', () => {
  const specOf = (order: string) =>
    TableSchema.parse({
      ...detail(false),
      data: { reference: 'rows', model: [{ name: 'value', type: 'categorical', order }] },
    });
  it('验证同步和异步摄入中的名称，无需重新排序行', async () => {
    const rows = [{ value: '10.18' }, { value: '10.2' }];
    expect(() => resolveTableData(specOf('missing'), { rows: [] })).toThrow(/unknown order/);
    await expect(
      prepareTableData(specOf('missing'), { dataBindings: { rows: { kind: 'rows', rows } } }),
    ).rejects.toThrow(/unknown order/);
    const prepared = await prepareTableData(specOf('naturalAscending'), {
      dataBindings: { rows: { kind: 'rows', rows } },
    });
    expect((await prepared.execute())?.rows).toEqual(rows);
    const fieldOrderDefinitions = [{ name: 'business', compare: () => 0 }];
    expect(() => resolveTableData(specOf('business'), { rows }, { fieldOrderDefinitions })).not.toThrow();
    const custom = await prepareTableData(
      specOf('business'),
      {
        dataBindings: {
          rows: {
            kind: 'result',
            result: {
              rows,
              model: [{ name: 'value', type: 'categorical', order: 'business' }],
            },
          },
        },
      },
      { fieldOrderDefinitions },
    );
    expect((await custom.execute())?.rows).toEqual(rows);
  });
  it('即使规范省略其模型，也会验证规范绑定模型', async () => {
    await expect(
      prepareTableData(detail(false), {
        dataBindings: {
          rows: {
            kind: 'result',
            result: {
              rows: [],
              model: [{ name: 'value', type: 'categorical', order: 'missing' }],
            },
          },
        },
      }),
    ).rejects.toThrow(/unknown order/);
  });
});

it('拒绝推断的数字 Table 字段上的顺序，而不进行转换', () => {
  const spec = TableSchema.parse({
    ...detail(false),
    data: { reference: 'rows', model: [{ name: 'value', order: 'naturalAscending' }] },
  });
  expect(() => resolveTableData(spec, { rows: [{ value: 12 }] })).toThrow(/order.*categorical/);
});
