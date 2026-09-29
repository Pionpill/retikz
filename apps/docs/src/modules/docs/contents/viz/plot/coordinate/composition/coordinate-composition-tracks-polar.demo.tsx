import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS,
  coordinateCompositionTracksPolarControls,
  previewControlContract,
} from './coordinate-composition-tracks-polar.controls';
import { CoordinateCompositionTracksPolarPreview } from './coordinate-composition-tracks-polar.preview';

/** 注册回退使用的极坐标轨道数据面板 */
export const previewControls = coordinateCompositionTracksPolarControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionTracksPolarPreview({
    startAngle: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle],
    lineWidth: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth],
    pointSize: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize],
    localAxes: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes],
    xGridVisible: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible],
    innerRadius: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius],
    sweepAngle: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle],
    trackGap: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap],
    sectorPadAngle: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle],
    sectorOpacity: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 多条径向轨道共享同一组角度分类 */
const Preview = controlledPreview.Component;

export default Preview;
