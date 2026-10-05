import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stackDivergingControls } from './transform-stack-diverging.controls';
import { TransformStackDivergingPreview } from './transform-stack-diverging.preview';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = stackDivergingControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => TransformStackDivergingPreview('zh'));

export const previewSource = controlledPreview.source;

const Preview = controlledPreview.Component;
export default Preview;
