import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonClipControls, previewControlContract } from './polygon-clip.controls';
import { renderPolygonClipPreview } from './polygon-clip.preview';

export const previewControls = polygonClipControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderPolygonClipPreview({
    top: values.top,
    right: values.right,
    left: values.left,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定使用 polygon，并通过三个顶点参数调整裁剪区域 */
const Demo: FC = controlledPreview.Component;

export default Demo;
