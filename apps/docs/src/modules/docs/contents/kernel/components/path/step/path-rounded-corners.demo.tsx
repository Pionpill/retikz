import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathRoundedCornersControls, previewControlContract } from './path-rounded-corners.controls';
import { PathRoundedCornersPreview } from './path-rounded-corners.preview';

export const previewControls = pathRoundedCornersControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathRoundedCornersPreview({
    strokeWidth: values.strokeWidth,
    lineJoin: values.lineJoin,
    radius: values.radius,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 折线几何圆角与描边拐点 playground
 * @description 上方 lineJoin 只改变描边；下方 roundedCorners 改变路径中心线几何
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
