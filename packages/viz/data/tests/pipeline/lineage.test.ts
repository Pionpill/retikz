import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, object } from 'zod';

import type { DataLineageEvent, DataLineageRun, ExternalRow } from '../../src';
import {
  applyTransforms,
  defineStatisticsReducer,
  defineStatisticsReducerImplementation,
  defineTransform,
  defineTransformImplementation,
  readSourceIndex,
  readSourceIndices,
  resolveStatisticsReducerImplementationRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
  SOURCE_INDICES,
  tagSourceIndex,
} from '../../src';
import { withGroupProvenance } from '../../src/provenance';

const SALES: Array<ExternalRow> = [
  { month: 'Jan', product: 'A', revenue: 3 },
  { month: 'Jan', product: 'B', revenue: 5 },
  { month: 'Feb', product: 'A', revenue: 2 },
  { month: 'Feb', product: 'B', revenue: 4 },
  { month: 'Feb', product: 'C', revenue: 6 },
];

/** 事件测试要求运行确实存在，不将缺失运行视为空事件 */
const lineageEventsOf = (lineage: DataLineageRun | undefined): Array<DataLineageEvent> => {
  if (lineage === undefined) throw new Error('expected an explicitly enabled lineage run');
  return lineage.events;
};

const eventsOf = <TKind extends DataLineageEvent['kind']>(
  events: Array<DataLineageEvent>,
  kind: TKind,
): Array<Extract<DataLineageEvent, { kind: TKind }>> =>
  events.filter((event): event is Extract<DataLineageEvent, { kind: TKind }> => event.kind === kind);

describe('数据血缘运行时', () => {
  it('展平大型嵌套来源组而不扩展调用参数', () => {
    const sourceIndices = Array.from({ length: 1_000_000 }, (_, index) => index);
    const grouped = withGroupProvenance({}, [{ [SOURCE_INDICES]: sourceIndices }]);
    const flattened = readSourceIndices(grouped);

    expect(flattened).toHaveLength(1_000_000);
    expect(flattened?.[0]).toBe(0);
    expect(flattened?.at(-1)).toBe(999_999);
  });

  it('applyTransforms 不包含血缘，默认仅记录受数量限制的源数据及步骤', () => {
    const plain = applyTransforms(tagSourceIndex(SALES), [
      {
        kind: 'summarize',
        params: {
          groupBy: ['month'],
          metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
        },
      },
    ]).rows;

    expect(readSourceIndices(plain[0])).toEqual([0, 1]);

    const { rows, lineage } = applyTransforms(
      SALES,
      [
        {
          kind: 'summarize',
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
          },
        },
      ],
      { provenance: true, lineage: {} },
    );

    expect(rows).toEqual([
      expect.objectContaining({ month: 'Jan', totalRevenue: 8 }),
      expect.objectContaining({ month: 'Feb', totalRevenue: 12 }),
    ]);
    expect(eventsOf(lineageEventsOf(lineage), 'source')).toHaveLength(1);
    expect(eventsOf(lineageEventsOf(lineage), 'transformStep')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        operationKind: 'summarize',
        inputRowCount: 5,
        outputRowCount: 2,
        inputFields: ['month', 'revenue'],
        outputFields: ['totalRevenue'],
        outputSourceIdentity: { mode: 'summary', count: 5, indices: [0, 1, 2, 3, 4], truncated: false },
      }),
    ]);
    expect(eventsOf(lineageEventsOf(lineage), 'rowSample')).toHaveLength(0);
    expect(eventsOf(lineageEventsOf(lineage), 'reducerOperation')).toHaveLength(0);
  });

  it('仅在其开关启用时记录现场流量和减速机操作', () => {
    const { lineage } = applyTransforms(
      SALES,
      [
        {
          kind: 'annotate',
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'mean', field: 'revenue', as: 'averageRevenue' }],
          },
        },
      ],
      { provenance: true, lineage: { fieldFlow: true, reducerOperations: true } },
    );

    expect(eventsOf(lineageEventsOf(lineage), 'fieldFlow')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        operationKind: 'annotate',
        inputFields: ['month', 'revenue'],
        outputFields: ['averageRevenue'],
      }),
    ]);
    expect(eventsOf(lineageEventsOf(lineage), 'reducerOperation')).toEqual([
      expect.objectContaining({
        operationKind: 'mean',
        inputFields: ['revenue'],
        outputFields: ['averageRevenue'],
        rowCount: 2,
      }),
      expect.objectContaining({
        operationKind: 'mean',
        inputFields: ['revenue'],
        outputFields: ['averageRevenue'],
        rowCount: 3,
      }),
    ]);
    expect(eventsOf(lineageEventsOf(lineage), 'selectorOperation')).toHaveLength(0);
  });

  it('保持选择器操作独立于归约器操作', () => {
    const selectorOnly = applyTransforms(
      SALES,
      [{ kind: 'select', params: { groupBy: ['month'], selector: { kind: 'top', by: 'revenue', n: 1 } } }],
      { provenance: true, lineage: { selectorOperations: true } },
    );

    expect(eventsOf(lineageEventsOf(selectorOnly.lineage), 'selectorOperation')).toEqual([
      expect.objectContaining({
        operationKind: 'top',
        operation: { kind: 'top', by: 'revenue', n: 1 },
        inputFields: ['revenue'],
        selectedSourceIdentity: { mode: 'summary', count: 1, indices: [1], truncated: false },
      }),
      expect.objectContaining({
        operationKind: 'top',
        operation: { kind: 'top', by: 'revenue', n: 1 },
        inputFields: ['revenue'],
        selectedSourceIdentity: { mode: 'summary', count: 1, indices: [4], truncated: false },
      }),
    ]);
    expect(eventsOf(lineageEventsOf(selectorOnly.lineage), 'reducerOperation')).toHaveLength(0);

    const reducerOnly = applyTransforms(
      SALES,
      [
        {
          kind: 'summarize',
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'count', as: 'rows' }],
          },
        },
      ],
      { provenance: true, lineage: { reducerOperations: true } },
    );

    expect(eventsOf(lineageEventsOf(reducerOnly.lineage), 'reducerOperation')).toHaveLength(2);
    expect(eventsOf(lineageEventsOf(reducerOnly.lineage), 'selectorOperation')).toHaveLength(0);
  });

  it('限制行样本并拒绝无界样本选项', () => {
    const { lineage } = applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
      provenance: true,
      lineage: { rowSamples: { maxRows: 1, fields: ['month', 'revenue'] } },
    });

    expect(eventsOf(lineageEventsOf(lineage), 'rowSample')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        phase: 'input',
        rows: [{ month: 'Jan', revenue: 3 }],
      }),
      expect.objectContaining({
        operationIndex: 0,
        phase: 'output',
        rows: [{ month: 'Feb', revenue: 2 }],
      }),
    ]);

    expect(() =>
      applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
        provenance: true,
        lineage: { rowSamples: { maxRows: 0, fields: ['month'] } },
      }),
    ).toThrow(/rowSamples.maxRows/);
    expect(() =>
      applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
        provenance: true,
        lineage: { rowSamples: { maxRows: 1, fields: [] } },
      }),
    ).toThrow(/rowSamples.fields/);
  });

  it.each([0.5, 1.5, NaN, Infinity])('拒绝 rowSamples.maxRows=%s', maxRows => {
    expect(() =>
      applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
        provenance: true,
        lineage: { rowSamples: { maxRows, fields: ['month'] } },
      }),
    ).toThrow(/rowSamples\.maxRows must be a positive integer/);
  });

  it('拒绝小数 calculationDetails.maxRows', () => {
    expect(() =>
      applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
        provenance: true,
        lineage: { calculationDetails: { maxRows: 1.5, fields: ['month'] } },
      }),
    ).toThrow(/calculationDetails\.maxRows must be a positive integer/);
  });

  it.each([0.5, 1.5, NaN, Infinity])('拒绝 sourceIdentity.maxIndices=%s', maxIndices => {
    expect(() =>
      applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
        provenance: true,
        lineage: { sourceIdentity: { maxIndices } },
      }),
    ).toThrow(/sourceIdentity\.maxIndices must be a positive integer/);
  });

  it.each([{ fields: [''], path: 'calculationDetails.fields[0]' }])(
    '拒绝 $path 处的无效样本字段白名单成员',
    ({ fields, path }) => {
      const option = path.startsWith('rowSamples') ? 'rowSamples' : 'calculationDetails';

      expect(() =>
        Reflect.apply(applyTransforms, undefined, [SALES, [], { lineage: { [option]: { maxRows: 1, fields } } }]),
      ).toThrow(`data lineage: ${path} must be a non-empty string`);
    },
  );

  it('通过共享注册表记录自定义转换步骤', () => {
    const doubleRevenue = defineTransform({
      kind: 'double-revenue',
      paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as }],
      }),
    });
    const doubleRevenueImplementation = defineTransformImplementation({
      definition: doubleRevenue,
      apply: (rows, operation) =>
        rows.map(row => ({ ...row, [operation.params.as]: Number(row[operation.params.field]) * 2 })),
    });

    const { rows, lineage } = applyTransforms(
      [{ revenue: 3 }],
      [{ kind: 'double-revenue', params: { field: 'revenue', as: 'doubleRevenue' } }],
      {
        provenance: true,
        registry: resolveTransformRegistry([doubleRevenue]),
        transformImplementations: [doubleRevenueImplementation],
        lineage: { fieldFlow: true },
      },
    );

    expect(rows).toEqual([expect.objectContaining({ revenue: 3, doubleRevenue: 6 })]);
    expect(eventsOf(lineageEventsOf(lineage), 'transformStep')).toEqual([
      expect.objectContaining({
        operationKind: 'double-revenue',
        inputFields: ['revenue'],
        outputFields: ['doubleRevenue'],
      }),
    ]);
    expect(eventsOf(lineageEventsOf(lineage), 'fieldFlow')).toHaveLength(1);
  });

  it('使用输出模型作为血缘字段流权限（如果可用）', () => {
    const derive = defineTransform({
      kind: 'derive',
      paramsSchema: object({ as: NonBlankStringSchema }),
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as, type: 'continuous' }],
      }),
    });
    const deriveImplementation = defineTransformImplementation({
      definition: derive,
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.params.as]: 1 })),
    });

    const { lineage } = applyTransforms([{ source: 1 }], [{ kind: 'derive', params: { as: 'derived' } }], {
      provenance: true,
      registry: resolveTransformRegistry([derive]),
      transformImplementations: [deriveImplementation],
      lineage: { fieldFlow: true },
    });

    expect(eventsOf(lineageEventsOf(lineage), 'transformStep')[0]?.outputFields).toEqual(['derived']);
    expect(eventsOf(lineageEventsOf(lineage), 'fieldFlow')[0]?.outputFields).toEqual(['derived']);
  });

  it('仅在明确请求时记录完整的源身份', () => {
    const operations = [
      {
        kind: 'summarize' as const,
        params: {
          metrics: [{ kind: 'count' as const, as: 'rows' }],
        },
      },
    ];

    const summary = applyTransforms(SALES, operations, {
      provenance: true,
      lineage: { sourceIdentity: { maxIndices: 2 } },
    });
    const full = applyTransforms(SALES, operations, {
      provenance: true,
      lineage: { sourceIdentity: { mode: 'full' } },
    });

    expect(eventsOf(lineageEventsOf(summary.lineage), 'transformStep')[0]?.outputSourceIdentity).toEqual({
      mode: 'summary',
      count: 5,
      indices: [0, 1],
      truncated: true,
    });
    expect(eventsOf(lineageEventsOf(full.lineage), 'transformStep')[0]?.outputSourceIdentity).toEqual({
      mode: 'full',
      count: 5,
      indices: [0, 1, 2, 3, 4],
      truncated: false,
    });
  });

  it('通过链式分组变换保持源身份', () => {
    const { rows, lineage } = applyTransforms(
      SALES,
      [
        {
          kind: 'summarize',
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
          },
        },
        {
          kind: 'summarize',
          params: {
            metrics: [{ kind: 'count', as: 'monthCount' }],
          },
        },
      ],
      { provenance: true, lineage: { sourceIdentity: { mode: 'full' } } },
    );

    expect(readSourceIndices(rows[0])).toEqual([0, 1, 2, 3, 4]);
    expect(eventsOf(lineageEventsOf(lineage), 'transformStep')[1]?.outputSourceIdentity).toEqual({
      mode: 'full',
      count: 5,
      indices: [0, 1, 2, 3, 4],
      truncated: false,
    });
  });

  it('当转换后的视图进入另一个血缘运行时，保留原始行标识', () => {
    const tagged = tagSourceIndex([{ value: 30 }, { value: 10 }, { value: 20 }]);
    const sorted = applyTransforms(tagged, [{ kind: 'sort', params: { field: 'value' } }]).rows;

    const { rows, lineage } = applyTransforms(sorted, [], { provenance: true, lineage: {} });

    expect(rows.map(readSourceIndex)).toEqual([1, 2, 0]);
    expect(eventsOf(lineageEventsOf(lineage), 'source')[0]?.sourceIdentity).toEqual({
      mode: 'summary',
      count: 3,
      indices: [1, 2, 0],
      truncated: false,
    });
  });

  it('保持分组来源而不分配中间行标识', () => {
    const tagged = tagSourceIndex([{ value: 10 }, { value: 20 }]);
    const grouped = withGroupProvenance({ total: 30 }, tagged);

    const { rows } = applyTransforms([grouped], [], { provenance: true, lineage: {} });

    expect(readSourceIndex(rows[0])).toBeUndefined();
    expect(readSourceIndices(rows[0])).toEqual([0, 1]);
  });

  it('流式传输接收器事件，除非有要求，否则不保留它们', () => {
    const streamed: Array<DataLineageEvent> = [];

    const { lineage } = applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
      provenance: true,
      lineage: { sink: event => streamed.push(event) },
    });
    const retained = applyTransforms(SALES, [{ kind: 'sort', params: { field: 'revenue' } }], {
      provenance: true,
      lineage: { sink: event => streamed.push(event), retainEvents: true },
    });

    expect(streamed.length).toBeGreaterThan(0);
    expect(lineageEventsOf(lineage)).toEqual([]);
    expect(lineageEventsOf(retained.lineage).length).toBeGreaterThan(0);
  });

  it('仅在明确启用时才使用计算细节采样', () => {
    const range = defineStatisticsReducer({
      schema: object({
        kind: literal('range'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputs: operation => [{ field: operation.as }],
    });
    const rangeImplementation = defineStatisticsReducerImplementation({
      definition: range,
      reduce: (rows, operation) => {
        const values = rows.map(row => Number(row[operation.field]));
        return { [operation.as]: Math.max(...values) - Math.min(...values) };
      },
    });

    const { lineage } = applyTransforms(
      SALES,
      [
        {
          kind: 'summarize',
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'range', field: 'revenue', as: 'revenueRange' }],
          },
        },
      ],
      {
        provenance: true,
        context: {
          statisticsReducerRegistry: resolveStatisticsReducerRegistry([range]),
          statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
            resolveStatisticsReducerRegistry([range]),
            [rangeImplementation],
          ),
        },
        lineage: { reducerOperations: true, calculationDetails: { maxRows: 1, fields: ['product', 'revenue'] } },
      },
    );

    expect(eventsOf(lineageEventsOf(lineage), 'reducerOperation')[0]).toEqual(
      expect.objectContaining({
        operationKind: 'range',
        detailRows: [{ product: 'A', revenue: 3 }],
      }),
    );
  });

  it('当转换查找失败时，不会产生成功的步骤事件', () => {
    expect(() =>
      applyTransforms([{ value: 1 }], [{ kind: 'missing', params: { value: 1 } }], { provenance: true, lineage: {} }),
    ).toThrow(/not registered/);
  });
});
