import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, textAttrsControls } from './text-attrs.en.controls';
import { TextAttrsPreview } from './text-attrs.preview';

export const previewControls = textAttrsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TextAttrsPreview(
    {
      fill: values.fill,
      opacity: values.opacity,
      fontFamily: values.fontFamily,
      fontSize: values.fontSize,
      fontWeight: values.fontWeight,
      fontStyle: values.fontStyle,
    },
    'en',
  ),
);

export const previewSource = controlledPreview.source;

/** Text line-level property override playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
