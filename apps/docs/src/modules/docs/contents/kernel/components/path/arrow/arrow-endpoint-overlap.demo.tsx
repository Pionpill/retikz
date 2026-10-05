import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { arrowEndpointOverlapControls, previewControlContract } from './arrow-endpoint-overlap.controls';
import { ArrowEndpointOverlapPreview } from './arrow-endpoint-overlap.preview';

export const previewControls = arrowEndpointOverlapControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ArrowEndpointOverlapPreview({
    shape: values.shape,
    overlap: values.overlap,
  }),
);

export const previewSource = controlledPreview.source;

/** 调整单个箭头进入 Pattern 矩形边界的比例 */
const Demo: FC = controlledPreview.Component;
export default Demo;
