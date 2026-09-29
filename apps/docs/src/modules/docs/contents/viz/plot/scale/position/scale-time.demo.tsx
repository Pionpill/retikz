import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleTimeControls } from './scale-time.controls';
import { ScaleTimePreview } from './scale-time.preview';

/** 注册回退使用的时间比例尺数据面板 */
export const previewControls = scaleTimeControls;

const controlledPreview = defineControlledPreview(previewControlContract, ScaleTimePreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 通过 temporal 字段契约自动派生 time scale */
const Preview = controlledPreview.Component;

export default Preview;
