import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateBetweenControls, previewControlContract } from './coordinate-between.controls';
import { CoordinateBetweenPreview } from './coordinate-between.preview';

export const previewControls = coordinateBetweenControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateBetweenPreview({
    fraction: values.fraction,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 比例定位 `{ between: [A, B], fraction }`
 * @description A、B 固定在 x 轴上，面板连续调整同一个 q 的 fraction；同样的输入可用于 Node.position / Coordinate / Step.to
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
