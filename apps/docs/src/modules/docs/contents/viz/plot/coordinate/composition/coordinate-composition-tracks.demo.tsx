import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS,
  coordinateCompositionTracksControls,
  previewControlContract,
} from './coordinate-composition-tracks.controls';
import { CoordinateCompositionTracksPreview } from './coordinate-composition-tracks.preview';

/** 注册回退使用的共享横轴轨道数据面板 */
export const previewControls = coordinateCompositionTracksControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionTracksPreview({
    bandProfile: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.bandProfile],
    lineWidth: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.lineWidth],
    localAxes: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes],
    xGridVisible: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.yGridVisible],
    trackGap: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.trackGap],
    drawdownAreaVisible: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.drawdownAreaVisible],
    signalPointSize: values[COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.signalPointSize],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 多条纵向轨道共享同一条横轴 */
const Preview = controlledPreview.Component;

export default Preview;
