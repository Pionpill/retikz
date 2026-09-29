import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './layout-defaults.controls';
import { LayoutDefaultsPreview } from './layout-defaults.preview';

export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LayoutDefaultsPreview({
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    opacity: values.opacity,
    fill: values.fill,
    padding: values.padding,
  }),
);

export const previewSource = controlledPreview.source;

/** Apply root defaults to every node and path */
const Demo: FC = controlledPreview.Component;

export default Demo;
