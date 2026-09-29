import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateAsAnchorControls, previewControlContract } from './coordinate-as-anchor.controls';
import { CoordinateAsAnchorPreview } from './coordinate-as-anchor.preview';

export const previewControls = coordinateAsAnchorControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateAsAnchorPreview(
    {
      positionX: values.positionX,
      positionY: values.positionY,
      verticalDistance: values.verticalDistance,
      horizontalDistance: values.horizontalDistance,
    },
    'zh',
  ),
);

export const previewSource = controlledPreview.source;

/**
 * `<Coordinate>` 作为命名虚拟锚点
 * @description hub 是不可见中心，4 个节点用 `position={{ of: 'hub', ... }}` 对称分布、4 条 path 都终止在 hub；固定坐标轴显出 hub 相对世界原点的位移。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
