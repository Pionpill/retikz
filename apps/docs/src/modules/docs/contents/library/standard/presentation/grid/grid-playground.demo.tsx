import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { gridPlaygroundControls, previewControlContract } from './grid-playground.controls';
import { renderGridPlaygroundPreview } from './grid-playground.preview';

export const previewControls = gridPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderGridPlaygroundPreview({
    boundsStart: values.boundsStart,
    boundsEnd: values.boundsEnd,
    lineStroke: values.lineStroke,
    lineStrokeWidth: values.lineStrokeWidth,
    lineOpacity: values.lineOpacity,
    lineDashed: values.lineDashed,
    majorEnabled: values.majorEnabled,
    majorEvery: values.majorEvery,
    majorOffset: values.majorOffset,
    majorStroke: values.majorStroke,
    majorStrokeWidth: values.majorStrokeWidth,
    majorOpacity: values.majorOpacity,
    majorDashed: values.majorDashed,
    borderEnabled: values.borderEnabled,
    borderPadding: values.borderPadding,
    borderOrder: values.borderOrder,
    borderExtendLines: values.borderExtendLines,
    borderStroke: values.borderStroke,
    borderStrokeWidth: values.borderStrokeWidth,
    borderOpacity: values.borderOpacity,
    borderFill: values.borderFill,
    borderFillOpacity: values.borderFillOpacity,
    borderDashed: values.borderDashed,
    spacingMode: values.spacingMode,
    spacing: values.spacing,
    spacingX: values.spacingX,
    originEnabled: values.originEnabled,
    originX: values.originX,
    includeBoundary: values.includeBoundary,
    spacingY: values.spacingY,
    originY: values.originY,
  }),
);

export const previewSource = controlledPreview.source;

/** Grid 范围、格距、线型、主线和边框 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
