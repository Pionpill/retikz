import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeShapeConnectionControls, previewControlContract } from './node-shape-connection.controls';
import { NodeShapeConnectionPreview } from './node-shape-connection.preview';

export const previewControls = nodeShapeConnectionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeShapeConnectionPreview({
    shapeA: values.shapeA,
    boundaryA: values.boundaryA,
    fitA: values.fitA,
    gapA: values.gapA,
    shapeB: values.shapeB,
    boundaryB: values.boundaryB,
    fitB: values.fitB,
    gapB: values.gapB,
    anchorA: values.anchorA,
    anchorB: values.anchorB,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Node 形状与连接 playground
 * @description 两个节点分别切换视觉 shape、连接面 boundary 与标准命名 anchor；同一条边实时显示端点解析结果
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
