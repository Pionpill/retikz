import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS,
  coordinateCompositionFacetMultilevelControls,
  previewControlContract,
} from './coordinate-composition-facet-multilevel.controls';
import { CoordinateCompositionFacetMultilevelPreview } from './coordinate-composition-facet-multilevel.preview';

/** 注册回退使用的多级分面数据面板 */
export const previewControls = coordinateCompositionFacetMultilevelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateCompositionFacetMultilevelPreview({
    rowHierarchy: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy],
    columnHierarchy: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy],
    rowHeaders: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders],
    columnHeaders: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders],
    scale: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale],
    panelGap: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap],
    xGridVisible: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible],
    yGridVisible: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible],
    lineWidth: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth],
    pointSize: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 行列各使用多层字段的分面布局 */
const Preview = controlledPreview.Component;

export default Preview;
