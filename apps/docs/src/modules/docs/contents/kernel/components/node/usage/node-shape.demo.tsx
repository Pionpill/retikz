import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeShapeControls, previewControlContract } from './node-shape.controls';
import { NodeShapePreview } from './node-shape.preview';

export const previewControls = nodeShapeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => NodeShapePreview(values));

export const previewSource = controlledPreview.source;

/** 通过切换 Core 内置形状观察 Node 的轮廓 */
const Demo: FC = controlledPreview.Component;

export default Demo;
