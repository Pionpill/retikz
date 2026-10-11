import type { DataLineageOptions, IRDataTransform } from '@retikz/data';
import { applyTransforms, readSourceIndex, readSourceIndices } from '@retikz/data';

/** 本页共用的原始观测，索引由输入顺序建立 */
export const sourceRows = [
  { region: 'East', period: 1, revenue: 3 },
  { region: 'East', period: 2, revenue: 5 },
  { region: 'West', period: 1, revenue: 2 },
  { region: 'West', period: 2, revenue: 4 },
];

/** 稳定排序后比较不同输出形态 */
export const provenanceOperationsOf = (kind: string): Array<IRDataTransform> => {
  const sort: IRDataTransform = { kind: 'sort', params: { field: 'revenue', order: 'ascending' } };
  switch (kind) {
    case 'select':
      return [sort, { kind: 'select', params: { groupBy: ['region'], selector: { kind: 'max', by: 'revenue' } } }];
    case 'annotate':
      return [
        sort,
        {
          kind: 'annotate',
          params: { groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }] },
        },
      ];
    case 'summarize':
      return [
        sort,
        {
          kind: 'summarize',
          params: { groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }] },
        },
      ];
    case 'smooth':
      return [
        sort,
        {
          kind: 'smooth',
          params: { groupBy: ['region'], x: 'period', y: 'revenue', xAs: 'trendX', yAs: 'trendY', sampleCount: 2 },
        },
      ];
    default:
      return [sort];
  }
};

/** 把 Symbol 来源投影为展示列，不改写计算结果 */
export const provenanceDisplayOf = (kind: string, provenance = true) =>
  applyTransforms(sourceRows, provenanceOperationsOf(kind), { provenance }).rows.map(row => ({
    ...row,
    sourceIndex: readSourceIndex(row) ?? '-',
    sourceIndices: JSON.stringify(readSourceIndices(row) ?? []),
  }));

/** 同一条链同时触发选择与规约事件 */
export const eventOperations: Array<IRDataTransform> = [
  { kind: 'sort', params: { field: 'revenue', order: 'ascending' } },
  { kind: 'select', params: { groupBy: ['region'], selector: { kind: 'max', by: 'revenue' } } },
  { kind: 'summarize', params: { groupBy: ['region'], metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }] } },
];

/** 记录范围试验的独立开关 */
export type ProvenanceEventValues = {
  provenance: boolean;
  full: boolean;
  maxIndices: number;
  steps: boolean;
  fields: boolean;
  reducers: boolean;
  selectors: boolean;
  samples: boolean;
  details: boolean;
  maxRows: number;
};

/** 详情采样与行样本使用相同的显式白名单 */
export const lineageOptionsOf = (values: ProvenanceEventValues): DataLineageOptions => ({
  sourceIdentity: { mode: values.full ? 'full' : 'summary', maxIndices: values.maxIndices },
  transformSteps: values.steps,
  fieldFlow: values.fields,
  reducerOperations: values.reducers,
  selectorOperations: values.selectors,
  rowSamples: values.samples ? { maxRows: values.maxRows, fields: ['region', 'revenue', 'total'] } : false,
  calculationDetails: values.details ? { maxRows: values.maxRows, fields: ['region', 'revenue'] } : false,
});
