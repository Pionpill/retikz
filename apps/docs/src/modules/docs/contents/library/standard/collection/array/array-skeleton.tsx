import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './array-skeleton.controls';
import { renderArraySkeletonPreview } from './array-skeleton.preview';

/** 注册回退 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderArraySkeletonPreview({ mode: values.mode, count: values.count, labels: values.labels, index: values.index }),
);
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
