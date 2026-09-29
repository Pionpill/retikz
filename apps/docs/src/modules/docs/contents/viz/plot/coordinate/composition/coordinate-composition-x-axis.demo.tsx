import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS,
  coordinateCompositionXAxisControls,
  previewControlContract,
} from './coordinate-composition-x-axis.controls';
import { CoordinateCompositionXAxisPreview } from './coordinate-composition-x-axis.preview';

/** 注册回退使用的双横轴数据面板 */
export const previewControls = coordinateCompositionXAxisControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionXAxisPreview({
    forecastAxis: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis],
    xGridVisible: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible],
    secondaryAxisSide: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide],
    completedLineWidth: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth],
    forecastLineWidth: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth],
    forecastPointsVisible: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible],
    forecastPointSize: values[COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 两个横轴分别绑定经过天数与日历日期 */
const Preview = controlledPreview.Component;

export default Preview;
