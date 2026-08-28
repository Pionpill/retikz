import type { IRDataSortTransform } from '@retikz/data';

import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { monthlyRevenue } from './transform-sort.data';

type TransformSortValues = {
  field: 'month' | 'revenue';
  order: 'ascending' | 'descending';
};

/** 按受控字段与方向构造 sort operation */
export const transformSortOperationOf = (values: TransformSortValues): IRDataSortTransform => ({
  kind: 'sort',
  field: values.field,
  order: values.order,
});

/** 渲染受控排序行序的单柱图 */
export const renderTransformSortPreview = (values: TransformSortValues) => (
  <Plot data={monthlyRevenue} width={400} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...transformSortOperationOf(values)} />
    <IntervalMark x="month" y="revenue" />
    <PlotScale dimension="x" type="band" paddingInner={0.2} paddingOuter={0.12} />
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
