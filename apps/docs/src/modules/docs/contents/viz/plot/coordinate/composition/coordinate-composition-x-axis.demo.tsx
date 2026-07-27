import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS,
  coordinateCompositionXAxisControls,
  previewControlContract,
} from './coordinate-composition-x-axis.controls';
import { releaseRows } from './coordinate-composition-x-axis.data';

/** 注册回退使用的双横轴数据面板 */
export const previewControls = coordinateCompositionXAxisControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const forecastAxisId =
    values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis] === 'calendar' ? 'calendar' : undefined;
  const xGridVisible = values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible];
  const yGridVisible = values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible];

  return (
    <Plot data={releaseRows} width={520} height={250}>
      <Axis dimension="x" grid={xGridVisible} title="T+" />
      <Axis
        id="calendar"
        dimension="x"
        placement={{ kind: 'side', side: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide] }}
        title="D"
      />
      <Axis dimension="y" grid={yGridVisible} title="%" />
      <PathMark
        x="elapsedDay"
        y="completed"
        order="elapsedDay"
        stroke="darkorange"
        strokeWidth={values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth]}
      />
      <PathMark
        x="calendarDay"
        y="forecast"
        order="calendarDay"
        xAxisId={forecastAxisId}
        stroke="steelblue"
        strokeWidth={values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth]}
      />
      {values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible] ? (
        <PointMark
          x="calendarDay"
          y="forecast"
          xAxisId={forecastAxisId}
          fill="lightblue"
          stroke="steelblue"
          strokeWidth={1}
          size={values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize]}
        />
      ) : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 两个横轴分别绑定经过天数与日历日期 */
export default controlledPreview.Component;
