import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './reference-entry.controls';
import { ReferencePreview } from './reference.preview';

/** 独立标注最小静态示例 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ReferencePreview({ threshold: 50, coordinate: values.coordinate }),
);
export const previewControls = previewControlContract.controls;
export const previewSource = controlledPreview.source;
const ReferenceEntry: FC = controlledPreview.Component;
export default ReferenceEntry;
