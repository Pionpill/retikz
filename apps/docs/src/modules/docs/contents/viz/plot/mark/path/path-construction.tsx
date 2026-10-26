import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './path-construction.controls';
import { PathConstructionPreview } from './path-construction.preview';

export { createPreviewControlContract } from './path-construction.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => PathConstructionPreview(values));
/** 稳定源码状态 */
export const previewSource = controlledPreview.source;
/** 图元交互控件 */
export const previewControls = previewControlContract.controls;
/** 路径构造交互示例 */
const PathConstruction: FC = controlledPreview.Component;
export default PathConstruction;
