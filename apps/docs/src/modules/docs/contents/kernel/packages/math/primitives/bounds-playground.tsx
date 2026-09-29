import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { boundsPlaygroundControls, previewControlContract } from './bounds-playground.controls';
import { BoundsPlaygroundPreview } from './bounds-playground.preview';

export const previewControls = boundsPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => BoundsPlaygroundPreview(values));

export const previewSource = controlledPreview.source;

/** 编辑点集并观察点集与圆弧共同影响轴对齐边界 */
const Demo: FC = controlledPreview.Component;

export default Demo;
