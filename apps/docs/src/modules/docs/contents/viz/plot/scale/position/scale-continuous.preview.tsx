import { PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';
import type { ReactElement } from 'react';

import type { previewControlContract } from './scale-continuous.controls';
import { continuousValues } from './scale-continuous.data';

const renderScale = (values: typeof previewControlContract.canonicalValues): ReactElement => {
  const domainPadding = {
    kind: 'ratio' as const,
    lower: values.domainPadding,
    upper: values.domainPadding,
  };
  if (values.scaleType === 'log') {
    return <PlotScale dimension="y" type="log" base={values.base} domainPadding={domainPadding} />;
  }

  if (values.scaleType === 'sqrt') {
    return <PlotScale dimension="y" type="sqrt" domainPadding={domainPadding} />;
  }

  if (values.scaleType === 'symlog') {
    return <PlotScale dimension="y" type="symlog" constant={values.constant} domainPadding={domainPadding} />;
  }

  return <PlotScale dimension="y" type="linear" domainPadding={domainPadding} />;
};

/** 图形参数 */
export type ScaleContinuousPreviewValues = {
  scaleType: 'linear' | 'log' | 'sqrt' | 'symlog';
  dataVariant: 'positive' | 'signed';
  base: number;
  constant: number;
  domainPadding: number;
};

/** 绘制示例图形 */
export const ScaleContinuousPreview = (values: ScaleContinuousPreviewValues) => {
  const yField =
    values.scaleType === 'log' || values.scaleType === 'sqrt' || values.dataVariant === 'positive'
      ? 'positive'
      : 'signed';

  return (
    <Plot data={continuousValues} width={400} height={260}>
      <PathMark x="period" y={yField} order="period" />
      <PointMark x="period" y={yField} />
      {renderScale(values)}
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
