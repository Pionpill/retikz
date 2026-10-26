import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './reference-path.controls';
import { ReferencePathPreview } from './reference-path.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values => ReferencePathPreview(values));
/** 稳定源码状态 */
export const previewSource = controlledPreview.source;
/** 图元属性控件 */
export const previewControls = previewControlContract.controls;
/** 图元交互示例 */
const ReferencePath: FC = controlledPreview.Component;
export default ReferencePath;
