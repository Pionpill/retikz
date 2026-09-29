import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ellipsePlaygroundControls, previewControlContract } from './ellipse-playground.controls';
import { renderEllipsePlaygroundPreview } from './ellipse-playground.preview';

export const previewControls = ellipsePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderEllipsePlaygroundPreview(values),
);

export const previewSource = controlledPreview.source;

/** Ellipse 构造与局部弧段 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
