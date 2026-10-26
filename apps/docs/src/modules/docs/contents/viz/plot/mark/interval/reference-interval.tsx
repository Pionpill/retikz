import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './reference-interval.controls';
import { ReferenceIntervalPreview } from './reference-interval.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => ReferenceIntervalPreview(values));
/** 稳定源码状态 */
export const previewSource = controlledPreview.source;
/** 图元属性控件 */
export const previewControls = previewControlContract.controls;
/** 图元交互示例 */
const ReferenceInterval: FC = controlledPreview.Component;
export default ReferenceInterval;
