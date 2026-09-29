import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { contourExampleControls, previewControlContract } from './contour-example.controls';
import { renderContourExamplePreview } from './contour-example.preview';

export const previewControls = contourExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderContourExamplePreview({
    preset: values.preset,
    cornerRadius: values.cornerRadius,
  }),
);

export const previewSource = controlledPreview.source;

/** 用预设顶点环调整 Contour 轮廓 */
const Demo: FC = controlledPreview.Component;

export default Demo;
