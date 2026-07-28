import type { IRDataSortTransform, IRDataSummarizeTransform } from '@retikz/data';

import { Axis, IntervalMark, Plot, Scale, Transform } from '@retikz/plot-react';

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

/** 渲染先汇总、后排序的固定 Transform 结构 */
export const renderTransformComponentPreview = () => {
  const [summarize, sort] = transformComponentOperationsOf();

  return (
    <Plot data={regionalOrders} width={400} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
      <Transform {...summarize} />
      <Transform {...sort} />
      <IntervalMark x="region" y="total" color="region" />
      <Scale dimension="y" type="linear" domainPadding={0} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
};
