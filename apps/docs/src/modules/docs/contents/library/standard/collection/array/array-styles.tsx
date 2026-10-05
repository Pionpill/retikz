import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './array-styles.controls';
import { renderArrayStylesPreview } from './array-styles.preview';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderArrayStylesPreview({
    indexEnabled: values.indexEnabled,
    indexPosition: values.indexPosition,
    indexStart: values.indexStart,
    indexFontSize: values.indexFontSize,
    indexFontWeight: values.indexFontWeight,
    indexTextColor: values.indexTextColor,
    direction: values.direction,
    widthMode: values.widthMode,
    width: values.width,
    autoHeight: values.autoHeight,
    height: values.height,
    padding: values.padding,
    gap: values.gap,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    cornerRadius: values.cornerRadius,
    fontSize: values.fontSize,
    override: values.override,
  }),
);

export const previewSource = controlledPreview.source;

const Demo = controlledPreview.Component;
export default Demo;
