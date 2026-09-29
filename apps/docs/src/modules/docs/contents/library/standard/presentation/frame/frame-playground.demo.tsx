import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { framePlaygroundControls, previewControlContract } from './frame-playground.controls';
import { renderFramePlaygroundPreview } from './frame-playground.preview';

export const previewControls = framePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderFramePlaygroundPreview({
    borderLineStyle: values.borderLineStyle,
    borderStroke: values.borderStroke,
    strokeWidth: values.strokeWidth,
    strokeOpacity: values.strokeOpacity,
    fillOpacity: values.fillOpacity,
    paddingX: values.paddingX,
    paddingY: values.paddingY,
    gap: values.gap,
    headerDirection: values.headerDirection,
    borderCornerRadius: values.borderCornerRadius,
    titleFillOpacity: values.titleFillOpacity,
    titleFontSize: values.titleFontSize,
    titleFontWeight: values.titleFontWeight,
    titlePadding: values.titlePadding,
    descriptionFontSize: values.descriptionFontSize,
    descriptionOpacity: values.descriptionOpacity,
    nodeAText: values.nodeAText,
    nodeBText: values.nodeBText,
    connected: values.connected,
  }),
);

export const previewSource = controlledPreview.source;

/** Frame 布局、边框与 header Node 字段 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
