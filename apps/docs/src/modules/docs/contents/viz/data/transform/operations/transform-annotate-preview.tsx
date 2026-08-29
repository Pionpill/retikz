import type { IRDataAnnotateTransform, IRDataReducerMetrics } from '@retikz/data';

import { PathMark, Plot, PlotAxis, PlotTransform, PointMark } from '@retikz/plot-react';

import { storeRevenue } from './transform-annotate.data';

type TransformAnnotateValues = {
  reducerKind: 'max' | 'mean' | 'median' | 'min';
};

/** 将受控 reducer 映射到统一 benchmark 字段 */
const metricsOf = (kind: TransformAnnotateValues['reducerKind']): IRDataReducerMetrics => [
  { kind, field: 'revenue', as: 'benchmark' },
];

/** 按受控 reducer 构造 annotate operation */
export const transformAnnotateOperationOf = (values: TransformAnnotateValues): IRDataAnnotateTransform => ({
  kind: 'annotate',
  groupBy: ['store'],
  metrics: metricsOf(values.reducerKind),
});

/** 渲染保留明细点且广播受控统计量的视图 */
export const renderTransformAnnotatePreview = (values: TransformAnnotateValues) => (
  <Plot data={storeRevenue} width={460} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...transformAnnotateOperationOf(values)} />
    <PointMark x="quarter" y="revenue" color="store" size={5} />
    <PathMark x="quarter" y="benchmark" series="store" strokeWidth={2.2} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
