import type { IRDataReducerMetrics, IRDataSummarizeTransform } from '@retikz/data';

import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { orders } from './transform-summarize.data';

type TransformSummarizeValues = {
  reducerKind: 'count' | 'max' | 'mean' | 'median' | 'min' | 'sum';
};

/** 将受控 reducer 统一映射到 metric 输出字段 */
const metricsOf = (kind: TransformSummarizeValues['reducerKind']): IRDataReducerMetrics =>
  kind === 'count' ? [{ kind, as: 'metric' }] : [{ kind, field: 'revenue', as: 'metric' }];

/** 按受控 reducer 构造 summarize operation */
export const transformSummarizeOperationOf = (values: TransformSummarizeValues): IRDataSummarizeTransform => ({
  kind: 'summarize',
  groupBy: ['region'],
  metrics: metricsOf(values.reducerKind),
});

/** 渲染受控统计规约后的分组柱形 */
export const renderTransformSummarizePreview = (values: TransformSummarizeValues) => (
  <Plot data={orders} width={400} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...transformSummarizeOperationOf(values)} />
    <IntervalMark x="region" y="metric" color="region" />
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
