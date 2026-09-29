import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawOrthogonalControls, previewControlContract } from './draw-orthogonal.controls';
import { DrawOrthogonalPreview } from './draw-orthogonal.preview';

export const previewControls = drawOrthogonalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => DrawOrthogonalPreview(values));

export const previewSource = controlledPreview.source;

/** 用固定端点比较 Draw 的单轴投影与四种折线连接 */
const Demo: FC = controlledPreview.Component;

export default Demo;
