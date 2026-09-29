import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { weatherRows } from './coordinate-composition-scopes.data';

/** 图形参数 */
export type CoordinateCompositionScopesPreviewValues = {
  rainfallAxis: 'rainfall' | 'default';
  xGridVisible: boolean;
  yGridVisible: boolean;
  secondaryAxisSide: 'right' | 'left';
  temperatureLineWidth: number;
  rainfallLineWidth: number;
  rainfallPointsVisible: boolean;
  rainfallPointSize: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionScopesPreview = (values: CoordinateCompositionScopesPreviewValues) => {
  const rainfallAxisId = values.rainfallAxis === 'rainfall' ? 'rainfall' : undefined;
  const xGridVisible = values.xGridVisible;
  const yGridVisible = values.yGridVisible;

  return (
    <Plot data={weatherRows} width={520} height={250}>
      <PlotAxis dimension="x" grid={xGridVisible} />
      <PlotAxis dimension="y" grid={yGridVisible} title="°C" />
      <PlotAxis id="rainfall" dimension="y" placement={{ kind: 'side', side: values.secondaryAxisSide }} title="mm" />
      <PathMark x="day" y="temperature" order="day" stroke="darkorange" strokeWidth={values.temperatureLineWidth} />
      <PathMark
        x="day"
        y="rainfall"
        order="day"
        yAxisId={rainfallAxisId}
        stroke="steelblue"
        strokeWidth={values.rainfallLineWidth}
      />
      {values.rainfallPointsVisible ? (
        <PointMark
          x="day"
          y="rainfall"
          yAxisId={rainfallAxisId}
          fill="lightblue"
          stroke="steelblue"
          strokeWidth={1}
          size={values.rainfallPointSize}
        />
      ) : null}
    </Plot>
  );
};
