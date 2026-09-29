import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { releaseRows } from './coordinate-composition-x-axis.data';

/** 图形参数 */
export type CoordinateCompositionXAxisPreviewValues = {
  forecastAxis: 'default' | 'calendar';
  xGridVisible: boolean;
  yGridVisible: boolean;
  secondaryAxisSide: 'top' | 'bottom';
  completedLineWidth: number;
  forecastLineWidth: number;
  forecastPointsVisible: boolean;
  forecastPointSize: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionXAxisPreview = (values: CoordinateCompositionXAxisPreviewValues) => {
  const forecastAxisId = values.forecastAxis === 'calendar' ? 'calendar' : undefined;
  const xGridVisible = values.xGridVisible;
  const yGridVisible = values.yGridVisible;

  return (
    <Plot data={releaseRows} width={520} height={250}>
      <PlotAxis dimension="x" grid={xGridVisible} title="T+" />
      <PlotAxis
        id="calendar"
        dimension="x"
        grid={xGridVisible}
        placement={{ kind: 'side', side: values.secondaryAxisSide }}
        title="D"
      />
      <PlotAxis dimension="y" grid={yGridVisible} title="%" />
      <PathMark
        x="elapsedDay"
        y="completed"
        order="elapsedDay"
        stroke="darkorange"
        strokeWidth={values.completedLineWidth}
      />
      <PathMark
        x="calendarDay"
        y="forecast"
        order="calendarDay"
        xAxisId={forecastAxisId}
        stroke="steelblue"
        strokeWidth={values.forecastLineWidth}
      />
      {values.forecastPointsVisible ? (
        <PointMark
          x="calendarDay"
          y="forecast"
          xAxisId={forecastAxisId}
          fill="lightblue"
          stroke="steelblue"
          strokeWidth={1}
          size={values.forecastPointSize}
        />
      ) : null}
    </Plot>
  );
};
