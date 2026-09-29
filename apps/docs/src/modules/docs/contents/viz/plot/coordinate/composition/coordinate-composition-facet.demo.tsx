import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_FACET_CONTROL_IDS,
  coordinateCompositionFacetControls,
  previewControlContract,
} from './coordinate-composition-facet.controls';
import { CoordinateCompositionFacetPreview } from './coordinate-composition-facet.preview';

/** 注册回退使用的分面布局控件 */
export const previewControls = coordinateCompositionFacetControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionFacetPreview({
    layout: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout],
    empty: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty],
    headers: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers],
    scale: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale],
    panelGap: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap],
    xGridVisible: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible],
    lineWidth: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth],
    pointSize: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 单行或网格分面、共享或独立纵轴范围的试验场 */
const Preview = controlledPreview.Component;

export default Preview;
