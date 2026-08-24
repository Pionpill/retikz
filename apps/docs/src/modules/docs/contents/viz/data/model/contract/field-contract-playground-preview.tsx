import type { IRDataModel } from '@retikz/data';

import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { fieldContractControls } from './field-contract-playground.controls';

import { categoricalRows, continuousRows, funnelRows, temporalRows } from './field-contract-playground.data';

type FieldContractValues = PreviewControlValuesFor<typeof fieldContractControls>;

/** 按字段语义状态渲染固定图元结构 */
export const renderFieldContractPreview = (values: FieldContractValues) => {
  const data =
    values.scenario === 'continuous'
      ? continuousRows
      : values.scenario === 'temporal'
        ? temporalRows
        : values.scenario === 'categorical'
          ? categoricalRows
          : funnelRows;
  const xType =
    values.scenario === 'continuous'
      ? 'continuous'
      : values.scenario === 'temporal'
        ? 'temporal'
        : values.scenario === 'categorical' || values.stageType === 'categorical'
          ? 'categorical'
          : undefined;
  const model: IRDataModel | undefined =
    xType === undefined
      ? undefined
      : [
          { name: 'x', type: xType },
          { name: 'value', type: 'continuous' },
        ];

  return (
    <Plot data={data} model={model} width={410} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
      <PointMark x="x" y="value" size={28} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
