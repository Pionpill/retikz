import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS,
  coordinateCompositionScopesControls,
  previewControlContract,
} from './coordinate-composition-scopes.controls';
import { weatherRows } from './coordinate-composition-scopes.data';

/** 注册回退使用的双纵轴数据面板 */
export const previewControls = coordinateCompositionScopesControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const rainfallAxisId =
    values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis] === 'rainfall' ? 'rainfall' : undefined;
  const xGridVisible = values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible];
  const yGridVisible = values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible];

  return (
    <Plot data={weatherRows} width={520} height={250}>
      <PlotAxis dimension="x" grid={xGridVisible} />
      <PlotAxis dimension="y" grid={yGridVisible} title="°C" />
      <PlotAxis
        id="rainfall"
        dimension="y"
        placement={{ kind: 'side', side: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide] }}
        title="mm"
      />
      <PathMark
        x="day"
        y="temperature"
        order="day"
        stroke="darkorange"
        strokeWidth={values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth]}
      />
      <PathMark
        x="day"
        y="rainfall"
        order="day"
        yAxisId={rainfallAxisId}
        stroke="steelblue"
        strokeWidth={values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth]}
      />
      {values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible] ? (
        <PointMark
          x="day"
          y="rainfall"
          yAxisId={rainfallAxisId}
          fill="lightblue"
          stroke="steelblue"
          strokeWidth={1}
          size={values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize]}
        />
      ) : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 两个纵轴分别绑定温度与降雨量 */
export default controlledPreview.Component;
