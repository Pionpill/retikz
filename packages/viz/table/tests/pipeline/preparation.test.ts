import { createDataTransformExecutor } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { TableSchema, prepareTableData, resolveTableData } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';

const detail = (transform = true) =>
  TableSchema.parse({
    namespace: 'table',
    type: 'table',
    data: { reference: 'rows' },
    structure: { kind: 'detail', header: false, columns: [{ id: 'value', field: transform ? 'ratio' : 'value' }] },
    ...(transform ? { transform: [{ operation: { kind: 'normalize', field: 'value', as: 'ratio' } }] } : {}),
  });

describe('Table data preparation', () => {
  it('transforms before structure resolution and preserves sync/async values and model', async () => {
    const spec = detail();
    const rows = [{ value: 2 }, { value: 6 }];
    const synchronous = resolveTableData(spec, { rows });
    const preparation = await prepareTableData(spec, { dataBindings: { rows: { kind: 'rows', rows } } });
    const preparedData = await preparation.execute();
    expect(preparedData).toEqual(synchronous);
    const structure = normalizeTableStructure(spec.structure, { data: spec.data, preparedData });
    expect(structure.cells.map(cell => cell.payload)).toEqual([
      { kind: 'value', value: 0.25 },
      { kind: 'value', value: 0.75 },
    ]);
    expect(preparedData?.model).toContainEqual({ name: 'ratio', type: 'continuous' });
    await expect(preparation.execute()).rejects.toThrow(/only once/);
  });

  it('keeps untransformed boolean, null and date-like values identical to raw Table structure', async () => {
    const spec = detail(false);
    const rows = [{ value: false }, { value: null }, { value: '2026-10-03' }];
    const preparation = await prepareTableData(spec, { dataBindings: { rows: { kind: 'rows', rows } } });
    const preparedData = await preparation.execute();
    const expected = normalizeTableStructure(spec.structure, { data: spec.data, datasets: { rows } });
    expect(normalizeTableStructure(spec.structure, { data: spec.data, preparedData })).toEqual(expected);
  });

  it('preserves format-implied temporal type through transforms', async () => {
    const spec = TableSchema.parse({
      ...detail(false),
      data: { reference: 'rows', model: [{ name: 'value', format: 'iso' }] },
      transform: [{ operation: { kind: 'sort', field: 'value' } }],
    });
    const preparation = await prepareTableData(spec, {
      dataBindings: { rows: { kind: 'rows', rows: [{ value: '2026-10-03' }] } },
    });
    const result = await preparation.execute();
    expect(result?.model).toEqual([{ name: 'value', type: 'temporal' }]);
    expect(result?.rows[0].value).toBe(Date.UTC(2026, 9, 3));
  });

  it('rejects Manual declarations and unbound Custom before computation', async () => {
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

  it('consumes native Promise results without promoting extra payload fields', async () => {
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

  it('rejects native model omission and source parsers on canonical bindings', async () => {
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

  it('preserves unknown empty fields and rejects structure fields outside the canonical model', async () => {
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
      normalizeTableStructure(
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
