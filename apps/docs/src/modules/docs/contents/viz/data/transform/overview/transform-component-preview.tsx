import type { IRDataSortTransform, IRDataSummarizeTransform } from '@retikz/data';

import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import { regionalOrders } from './transform-component.data';

/** 构造先汇总、后排序的根 transform 链 */
export const transformComponentOperationsOf = (): [IRDataSummarizeTransform, IRDataSortTransform] => [
  {
    kind: 'summarize',
    groupBy: ['region'],
    metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
  },
  { kind: 'sort', field: 'total', order: 'descending' },
];

/** 渲染先汇总、后排序的固定 PlotTransform 结构 */
export const renderTransformComponentPreview = () => {
  const [summarize, sort] = transformComponentOperationsOf();

  return (
    <Plot data={regionalOrders} width={400} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
      <PlotTransform {...summarize} />
      <PlotTransform {...sort} />
      <IntervalMark x="region" y="total" color="region" />
      <PlotScale dimension="y" type="linear" domainPadding={0} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
