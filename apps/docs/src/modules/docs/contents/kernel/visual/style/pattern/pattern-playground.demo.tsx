import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { patternPlaygroundControls, previewControlContract } from './pattern-playground.controls';
import { PatternPlaygroundPreview } from './pattern-playground.preview';

export const previewControls = patternPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PatternPlaygroundPreview({
    background: values.background,
    lineStyle: values.lineStyle,
    shape: values.shape,
    lineCap: values.lineCap,
    lineCycle: values.lineCycle,
    lineWidth: values.lineWidth,
    size: values.size,
    gridHorizontalStyle: values.gridHorizontalStyle,
    gridVerticalStyle: values.gridVerticalStyle,
    rotation: values.rotation,
    color: values.color,
  }),
);

export const previewSource = controlledPreview.source;

/** 固定图元和取景，只让 pattern 规格变化 */
const Demo: FC = controlledPreview.Component;

export default Demo;
