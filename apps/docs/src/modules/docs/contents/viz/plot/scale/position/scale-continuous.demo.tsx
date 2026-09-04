import type { ReactElement } from 'react';

import { PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleContinuousControls } from './scale-continuous.controls';
import { continuousValues } from './scale-continuous.data';

/** 注册回退使用的连续位置比例尺 controls */
export const previewControls = scaleContinuousControls;

/** 按当前 controls 状态构造合法的位置比例尺声明 */
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const yField =
    values.scaleType === 'log' || values.scaleType === 'sqrt' || values.dataVariant === 'positive'
      ? 'positive'
      : 'signed';

  return (
    <Plot data={continuousValues} width={400} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <PathMark x="period" y={yField} order="period" />
      <PointMark x="period" y={yField} />
      {renderScale(values)}
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一构图中切换 linear、log、sqrt 与 symlog */
export default controlledPreview.Component;
