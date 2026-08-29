import type { ExternalRow, IRDataModel } from '@retikz/data';

import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { valueParsingControls } from './value-parsing.controls';

import { canonicalRows, mixedRows, reportRows } from './value-parsing.data';

type ValueParsingValues = PreviewControlValuesFor<typeof valueParsingControls>;

const standardModel: IRDataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', type: 'continuous' },
];

const reportModel: IRDataModel = [
  { name: 'month', format: 'slashDate' },
  { name: 'revenue', format: 'percent' },
];

/** 按存储形态选择默认转换或声明式格式 */
export const renderValueParsingPreview = (values: ValueParsingValues) => {
  const data: Array<ExternalRow> =
    values.inputShape === 'canonical' ? canonicalRows : values.inputShape === 'report' ? reportRows : mixedRows;
  const model = values.inputShape === 'report' ? reportModel : standardModel;

  return (
    <Plot data={data} model={model} width={410} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
