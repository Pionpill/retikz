import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, primitiveModelPlaygroundControls } from './primitive-model-playground.controls';
import { PrimitiveModelPlaygroundPreview } from './primitive-model-playground.preview';

export const previewControls = primitiveModelPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PrimitiveModelPlaygroundPreview({
    sourceAngle: values.sourceAngle,
    shape: values.shape,
    boundary: values.boundary,
    fit: values.fit,
    gap: values.gap,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    content: values.content,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 图元模型 playground
 * @description 固定目标位置、来源轨道与取景，交互比较图元内容、内置 shape、连接面和基础样式
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
