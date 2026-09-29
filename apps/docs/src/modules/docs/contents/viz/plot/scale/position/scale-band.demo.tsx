import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleBandControls } from './scale-band.controls';
import { ScaleBandPreview } from './scale-band.preview';

/** 注册回退使用的分类位置比例尺 controls */
export const previewControls = scaleBandControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ScaleBandPreview({
    scaleType: values.scaleType,
    paddingInner: values.paddingInner,
    paddingOuter: values.paddingOuter,
    padding: values.padding,
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 用对应图元直接比较 band 格宽与 point 点位 */
const Preview = controlledPreview.Component;

export default Preview;
