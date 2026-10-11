import type { ExternalRow, IRDataTransform } from '@retikz/data';

/** 两篇原理页共用的最小明细集 */
export const mechanismRows: Array<ExternalRow> = [
  { team: 'A', item: 'a1', value: 10 },
  { team: 'A', item: 'a2', value: 30 },
  { team: 'B', item: 'b1', value: 25 },
  { team: 'B', item: 'b2', value: 35 },
];

/** 汇总字段片段由宿主组装为每组一行 */
export const mechanismSummary: IRDataTransform = {
  kind: 'summarize',
  params: {
    groupBy: ['team'],
    metrics: [
      { kind: 'sum', field: 'value', as: 'total' },
      { kind: 'count', as: 'count' },
    ],
  },
};

/** 后一阶段读取前一阶段产生的 total 字段 */
export const mechanismPipeline: Array<IRDataTransform> = [
  mechanismSummary,
  { kind: 'sort', params: { field: 'total', order: 'descending' } },
];

/** 行选择保留被选行的其它字段 */
export const mechanismSelection: IRDataTransform = {
  kind: 'select',
  params: {
    groupBy: ['team'],
    selector: { kind: 'max', by: 'value' },
  },
};
