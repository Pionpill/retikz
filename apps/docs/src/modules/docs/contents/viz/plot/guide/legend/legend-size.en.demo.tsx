import { defineControlledPreview } from '@/modules/docs/preview';

import { legendSizeControls, previewControlContract } from './legend-size.en.controls';
import { LegendSizePreview } from './legend-size.preview';

/** 注册回退使用的尺寸图例控件 */
export const previewControls = legendSizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LegendSizePreview(
    {
      position: values.position,
      orient: values.orient,
      symbolSize: values.symbolSize,
      symbolFit: values.symbolFit,
    },
    'en',
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** size 梯度符号：连续字段通过 sqrt scale 生成代表大小与数值标签 */
const Preview = controlledPreview.Component;

export default Preview;
