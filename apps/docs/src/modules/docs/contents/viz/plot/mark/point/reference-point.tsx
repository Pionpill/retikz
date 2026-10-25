import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './reference-point.controls';
import { ReferencePointPreview } from './reference-point.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => ReferencePointPreview(values));
/** 稳定源码状态 */
export const previewSource = controlledPreview.source;
/** 图元属性控件 */
export const previewControls = previewControlContract.controls;
/** 图元交互示例 */
const ReferencePoint: FC = controlledPreview.Component;
export default ReferencePoint;
