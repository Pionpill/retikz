import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleContinuousControls } from './scale-continuous.controls';
import { ScaleContinuousPreview } from './scale-continuous.preview';

/** 注册回退使用的连续颜色比例尺 controls */
export const previewControls = scaleContinuousControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => ScaleContinuousPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一散点图中切换连续与发散颜色比例尺 */
const Preview = controlledPreview.Component;

export default Preview;
