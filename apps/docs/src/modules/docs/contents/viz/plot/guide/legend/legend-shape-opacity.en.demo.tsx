import { defineControlledPreview } from '@/modules/docs/preview';

import { legendShapeOpacityControls, previewControlContract } from './legend-shape-opacity.en.controls';
import { LegendShapeOpacityPreview } from './legend-shape-opacity.preview';

/** 注册回退使用的形状与透明度图例控件 */
export const previewControls = legendShapeOpacityControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LegendShapeOpacityPreview(
    {
      showShape: values.showShape,
      shapePosition: values.shapePosition,
      showOpacity: values.showOpacity,
      opacityPosition: values.opacityPosition,
      tickCount: values.tickCount,
    },
    'en',
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** shape + opacity：分类形状和连续透明度各自生成独立图例 */
const Preview = controlledPreview.Component;

export default Preview;
