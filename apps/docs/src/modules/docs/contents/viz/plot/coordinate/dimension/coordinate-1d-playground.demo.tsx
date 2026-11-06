import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_1D_PLAYGROUND_CONTROL_IDS,
  coordinate1DPlaygroundControls,
  previewControlContract,
} from './coordinate-1d-playground.controls';
import { Coordinate1dPlaygroundPreview } from './coordinate-1d-playground.preview';

/** 注册回退使用的一维坐标系控件 */
export const previewControls = coordinate1DPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  Coordinate1dPlaygroundPreview({
    coordinate: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate],
    orientation: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation],
    radius: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius],
    startAngle: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle],
    sweepAngle: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle],
    pointSize: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize],
    pointFill: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill],
    pointStroke: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke],
    pointStrokeWidth: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth],
    pointOpacity: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity],
    axisVisible: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible],
    axisStroke: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke],
    axisStrokeWidth: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 一维直线与圆周坐标系试验场 */
const Preview = controlledPreview.Component;

export default Preview;
