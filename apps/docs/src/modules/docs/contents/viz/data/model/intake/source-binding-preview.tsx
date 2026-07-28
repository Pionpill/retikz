import type { ExternalRow, IRDataModel } from '@retikz/data';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { sourceBindingControls } from './source-binding.controls';

import { currentSales, financeFeed, forecastSales } from './source-binding.data';

type SourceBindingValues = PreviewControlValuesFor<typeof sourceBindingControls>;

const model: IRDataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', type: 'continuous' },
];

/** 保持消费字段不变并按状态切换物理数据源 */
export const renderSourceBindingPreview = (values: SourceBindingValues) => {
  const data: Array<ExternalRow> =
    values.source === 'forecast' ? forecastSales : values.source === 'finance' ? financeFeed : currentSales;
  const fieldMap = values.source === 'finance' ? { month: 'period', revenue: 'amount' } : undefined;

  return (
    <Plot
      data={data}
      model={model}
      fieldMap={fieldMap}
      width={410}
      height={250}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" tickLabels={{ format: '%b', layout: { rotate: false } }} />
      <Axis dimension="y" grid />
    </Plot>
  );
};
