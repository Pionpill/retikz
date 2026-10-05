import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './map-skeleton.controls';
import { renderMapSkeletonPreview } from './map-skeleton.preview';

/** 注册回退 */
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderMapSkeletonPreview({ keys: values.keys, empty: values.empty }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
