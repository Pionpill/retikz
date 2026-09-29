import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { axisLineControls, previewControlContract } from './axis-line.controls';
import { AxisLinePreview } from './axis-line.preview';

export const previewControls = axisLineControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => AxisLinePreview(values));

export const previewSource = controlledPreview.source;

/** 用固定端点比较单轴投影与四种折线连接 */
const Demo: FC = controlledPreview.Component;

export default Demo;
