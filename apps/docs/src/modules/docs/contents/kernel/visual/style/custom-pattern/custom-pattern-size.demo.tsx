import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { customPatternSizeControls, previewControlContract } from './custom-pattern-size.controls';
import { CustomPatternSizePreview } from './custom-pattern-size.preview';

export const previewControls = customPatternSizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CustomPatternSizePreview({
    background: values.background,
    size: values.size,
    rotation: values.rotation,
    color: values.color,
  }),
);

export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
