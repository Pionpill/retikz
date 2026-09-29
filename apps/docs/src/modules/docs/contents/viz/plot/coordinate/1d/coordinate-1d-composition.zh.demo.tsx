import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_1D_COMPOSITION_CONTROL_IDS,
  coordinate1DCompositionControls,
  previewControlContract,
} from './coordinate-1d-composition.controls';
import { Coordinate1dCompositionPreview } from './coordinate-1d-composition.preview';

/** 注册回退使用的一维映射组合控件 */
export const previewControls = coordinate1DCompositionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  Coordinate1dCompositionPreview({
    routing: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.routing],
    orthogonalVia: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.orthogonalVia],
    bendDirection: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendDirection],
    bendAngle: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.bendAngle],
    sourcePointSize: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourcePointSize],
    sourceLabelVisible: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelVisible],
    sourceLabelDistance: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelDistance],
    sourceLabelSize: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelSize],
    sourceLabelRotate: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.sourceLabelRotate],
    targetPointSize: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetPointSize],
    targetLabelVisible: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelVisible],
    targetLabelSize: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.targetLabelSize],
    relationOpacity: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationOpacity],
    relationStrokeWidth: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth],
    axisVisible: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible],
    axisStroke: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke],
    axisStrokeWidth: values[COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示一维映射后的节点如何继续参与关系组合 */
const Preview = controlledPreview.Component;

export default Preview;
