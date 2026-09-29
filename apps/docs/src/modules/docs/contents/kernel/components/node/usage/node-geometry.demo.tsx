import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeGeometryControls, previewControlContract } from './node-geometry.controls';
import { NodeGeometryPreview } from './node-geometry.preview';

export const previewControls = nodeGeometryControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeGeometryPreview({
    cornerRadius: values.cornerRadius,
    scale: values.scale,
    rotate: values.rotate,
    paddingX: values.paddingX,
    paddingY: values.paddingY,
    margin: values.margin,
    minimumWidth: values.minimumWidth,
    minimumHeight: values.minimumHeight,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Node 几何 playground
 * @description 固定参照节点 a 与可调节点 q 保持同一结构，连接线同时显示 margin、尺寸、缩放与旋转后的边界变化
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
