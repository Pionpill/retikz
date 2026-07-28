import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformBoxplotControls } from './transform-boxplot.controls';
import { renderTransformBoxplotPreview } from './transform-boxplot-preview';

/** 注册回退使用的箱线图统计控件 */
export const previewControls = transformBoxplotControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformBoxplotPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 同步调整箱体、须线与异常点边界的动态示例 */
export default controlledPreview.Component;
