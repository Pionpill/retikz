import { Axis, IntervalMark, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleBandControls } from './scale-band.controls';
import { segments } from './scale-band.data';

/** 注册回退使用的分类位置比例尺 controls */
export const previewControls = scaleBandControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Plot data={segments} width={400} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
      {values.scaleType === 'band' ? (
        <IntervalMark x="segment" y="revenue" />
      ) : (
        <>
          <PathMark x="segment" y="revenue" />
          <PointMark x="segment" y="revenue" size={6} />
        </>
      )}
      {values.scaleType === 'band' ? (
        <Scale dimension="x" type="band" paddingInner={values.paddingInner} paddingOuter={values.paddingOuter} />
      ) : (
        <Scale dimension="x" type="point" padding={values.padding} />
      )}
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 用对应图元直接比较 band 格宽与 point 点位 */
export default controlledPreview.Component;
