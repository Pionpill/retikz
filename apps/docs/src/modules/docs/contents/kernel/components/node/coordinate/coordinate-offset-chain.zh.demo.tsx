import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateOffsetChainControls, previewControlContract } from './coordinate-offset-chain.controls';
import { CoordinateOffsetChainPreview } from './coordinate-offset-chain.preview';

export const previewControls = coordinateOffsetChainControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CoordinateOffsetChainPreview({
    rootX: values.rootX,
    rootY: values.rootY,
    stepX: values.stepX,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * Coordinate 链式偏移
 * @description ca → cb → cc 三个 coordinate 用 `{ of, offset }` 派生；固定坐标轴显出移动 ca 后整组相对世界原点的位移。
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
