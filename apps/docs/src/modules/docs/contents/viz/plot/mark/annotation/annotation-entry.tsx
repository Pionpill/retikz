import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './annotation-entry.controls';
import { AnnotationPreview } from './annotation.preview';

/** 独立标注最小静态示例 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  AnnotationPreview({ threshold: 50, coordinate: values.coordinate }),
);
export const previewControls = previewControlContract.controls;
export const previewSource = controlledPreview.source;
const AnnotationEntry: FC = controlledPreview.Component;
export default AnnotationEntry;
