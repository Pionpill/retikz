import type { ReactElement } from 'react';

import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleContinuousControls } from './scale-continuous.controls';
import { continuousValues } from './scale-continuous.data';

/** 注册回退使用的连续位置比例尺 controls */
export const previewControls = scaleContinuousControls;

/** 按当前 controls 状态构造合法的位置比例尺声明 */
const renderScale = (values: typeof previewControlContract.canonicalValues): ReactElement => {
  if (values.scaleType === 'log') {
    return <Scale dimension="y" type="log" base={values.base} domainPadding={values.domainPadding} />;
  }
  if (values.scaleType === 'sqrt') {
    return <Scale dimension="y" type="sqrt" domainPadding={values.domainPadding} />;
  }
  if (values.scaleType === 'symlog') {
    return <Scale dimension="y" type="symlog" constant={values.constant} domainPadding={values.domainPadding} />;
  }
  return <Scale dimension="y" type="linear" domainPadding={values.domainPadding} />;
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
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一构图中切换 linear、log、sqrt 与 symlog */
export default controlledPreview.Component;
