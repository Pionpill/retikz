import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_NODE_SHAPE_CONTROL_IDS, pointNodeShapeOf, previewControlContract } from './point-node-shape.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={points}
    width={400}
    height={280}
    coordinate={values[POINT_NODE_SHAPE_CONTROL_IDS.coordinate] === 'polar2D' ? 'polar2D' : undefined}
  >
    <PointMark
      x="x"
      y="y"
      color="region"
      size={values[POINT_NODE_SHAPE_CONTROL_IDS.size]}
      rotate={values[POINT_NODE_SHAPE_CONTROL_IDS.rotate]}
      shape={pointNodeShapeOf({
        shape: values[POINT_NODE_SHAPE_CONTROL_IDS.shape],
        size: values[POINT_NODE_SHAPE_CONTROL_IDS.size],
        starPoints: values[POINT_NODE_SHAPE_CONTROL_IDS.starPoints],
        polygonSides: values[POINT_NODE_SHAPE_CONTROL_IDS.polygonSides],
      })}
      label="label"
      labelPosition="top"
      labelDistance={8}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在固定散点位置上切换 core Node 边界形状 */
const Demo: FC = controlledPreview.Component;

export default Demo;
