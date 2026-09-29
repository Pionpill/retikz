import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { POINT_NODE_SHAPE_CONTROL_IDS, previewControlContract } from './point-node-shape.controls';
import { PointNodeShapePreview } from './point-node-shape.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PointNodeShapePreview({
    coordinate: values[POINT_NODE_SHAPE_CONTROL_IDS.coordinate],
    size: values[POINT_NODE_SHAPE_CONTROL_IDS.size],
    rotate: values[POINT_NODE_SHAPE_CONTROL_IDS.rotate],
    shape: values[POINT_NODE_SHAPE_CONTROL_IDS.shape],
    starPoints: values[POINT_NODE_SHAPE_CONTROL_IDS.starPoints],
    polygonSides: values[POINT_NODE_SHAPE_CONTROL_IDS.polygonSides],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在固定散点位置上切换 core Node 边界形状 */
const Demo: FC = controlledPreview.Component;

export default Demo;
