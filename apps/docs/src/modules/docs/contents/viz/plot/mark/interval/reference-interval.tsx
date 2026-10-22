import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './reference-interval.controls';
import { AnnotationIntervalPreview } from './reference-interval.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => AnnotationIntervalPreview(values));
/** 稳定源码状态 */
export const previewSource = controlledPreview.source;
/** 标注属性控件 */
export const previewControls = previewControlContract.controls;
/** 标注交互示例 */
const AnnotationInterval: FC = controlledPreview.Component;
export default AnnotationInterval;
