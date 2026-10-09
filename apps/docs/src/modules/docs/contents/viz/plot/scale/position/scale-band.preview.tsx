import { IntervalMark, PathMark, Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import { segments } from './scale-band.data';

/** 图形参数 */
export type ScaleBandPreviewValues = {
  scaleType: 'point' | 'band';
  paddingInner: number;
  paddingOuter: number;
  padding: number;
};

/** 绘制示例图形 */
export const ScaleBandPreview = (values: ScaleBandPreviewValues) => {
  return (
    <Plot data={segments} width={400} height={270}>
      {values.scaleType === 'band' ? (
        <IntervalMark x="segment" y="revenue" />
      ) : (
        <>
          <PathMark x="segment" y="revenue" />
          <PointMark x="segment" y="revenue" size={6} />
        </>
      )}
      {values.scaleType === 'band' ? (
        <BuiltinPlotScale
          dimension="x"
          type="band"
          paddingInner={values.paddingInner}
          paddingOuter={values.paddingOuter}
        />
      ) : (
        <BuiltinPlotScale dimension="x" type="point" padding={values.padding} />
      )}
      <BuiltinPlotScale dimension="y" type="linear" domainPadding={0} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
