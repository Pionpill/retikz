import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleDiscretizationControls } from './scale-discretization.controls';
import { ScaleDiscretizationPreview } from './scale-discretization.preview';

/** 注册回退使用的离散化颜色比例尺 controls */
export const previewControls = scaleDiscretizationControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => ScaleDiscretizationPreview(values));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一份偏斜数据上比较等宽、业务阈值与等频分档 */
const Preview = controlledPreview.Component;

export default Preview;
