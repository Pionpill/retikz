import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS,
  coordinateCompositionScopesControls,
  previewControlContract,
} from './coordinate-composition-scopes.controls';
import { CoordinateCompositionScopesPreview } from './coordinate-composition-scopes.preview';

/** 注册回退使用的双纵轴数据面板 */
export const previewControls = coordinateCompositionScopesControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionScopesPreview({
    rainfallAxis: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis],
    xGridVisible: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible],
    secondaryAxisSide: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide],
    temperatureLineWidth: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth],
    rainfallLineWidth: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth],
    rainfallPointsVisible: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible],
    rainfallPointSize: values[COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 两个纵轴分别绑定温度与降雨量 */
const Preview = controlledPreview.Component;

export default Preview;
