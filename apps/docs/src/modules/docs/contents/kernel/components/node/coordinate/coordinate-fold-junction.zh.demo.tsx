import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateFoldJunctionControls, previewControlContract } from './coordinate-fold-junction.controls';
import { CoordinateFoldJunctionPreview } from './coordinate-fold-junction.preview';

export const previewControls = coordinateFoldJunctionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateFoldJunctionPreview(
    {
      junctionX: values.junctionX,
      junctionY: values.junctionY,
    },
    'zh',
  ),
);

export const previewSource = controlledPreview.source;

/**
 * Coordinate 作为命名拐点汇聚
 * @description 多个 step 节点向同一决策汇合点收敛，汇合点本身不画矩形 / 不打字；各 path 用 `<Draw way={['A', 'junction', 'B']}>` 经过它，coordinate 只有中心坐标，端点会贴到该中心。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
