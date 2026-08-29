import type { IRDataSelectorOperation, IRDataSelectTransform } from '@retikz/data';

import { Plot, PlotAxis, PlotTransform, PointMark } from '@retikz/plot-react';

import { cityRevenue } from './transform-select.data';

type TransformSelectValues = {
  selectorKind: 'bottom' | 'max' | 'min' | 'top';
  n: number;
  tie: 'all' | 'first' | 'last';
};

/** 按受控类型构造内置 row selector */
const selectorOf = (values: TransformSelectValues): IRDataSelectorOperation =>
  values.selectorKind === 'top' || values.selectorKind === 'bottom'
    ? { kind: values.selectorKind, by: 'revenue', n: values.n, tie: values.tie }
    : { kind: values.selectorKind, by: 'revenue', tie: values.tie };

/** 按受控 selector 构造 select operation */
export const transformSelectOperationOf = (values: TransformSelectValues): IRDataSelectTransform => ({
  kind: 'select',
  groupBy: ['region'],
  selector: selectorOf(values),
});

/** 渲染受控 selector 保留的原始城市行 */
export const renderTransformSelectPreview = (values: TransformSelectValues) => (
  <Plot data={cityRevenue} width={520} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PlotTransform {...transformSelectOperationOf(values)} />
    <PointMark x="city" y="revenue" color="region" text="city" size={7} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
