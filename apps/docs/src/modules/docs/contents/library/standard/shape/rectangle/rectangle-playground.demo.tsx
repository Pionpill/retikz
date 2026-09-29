import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, rectanglePlaygroundControls } from './rectangle-playground.controls';
import { renderRectanglePlaygroundPreview } from './rectangle-playground.preview';

export const previewControls = rectanglePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderRectanglePlaygroundPreview({
    width: values.width,
    height: values.height,
    cornerRadius: values.cornerRadius,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
  }),
);

export const previewSource = controlledPreview.source;

/** Rectangle 尺寸与圆角 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
