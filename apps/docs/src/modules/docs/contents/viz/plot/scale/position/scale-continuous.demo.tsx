import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleContinuousControls } from './scale-continuous.controls';
import { ScaleContinuousPreview } from './scale-continuous.preview';

/** 注册回退使用的连续位置比例尺 controls */
export const previewControls = scaleContinuousControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => ScaleContinuousPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一构图中切换 linear、log、sqrt 与 symlog */
const Preview = controlledPreview.Component;

export default Preview;
