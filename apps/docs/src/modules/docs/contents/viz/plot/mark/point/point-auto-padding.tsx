import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './point-auto-padding.controls';
import { PointAutoPaddingPreview } from './point-auto-padding.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => PointAutoPaddingPreview(values));
/** canonical 源码 */
export const previewSource = controlledPreview.source;
/** 自动留白示例 */
export const previewControls = previewControlContract.controls;
/** 自动留白试验场 */
const PointAutoPadding: FC = controlledPreview.Component;
export default PointAutoPadding;
