import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './theme-inheritance.controls';
import { ThemeInheritancePreview } from './theme-inheritance.preview';

export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  ThemeInheritancePreview({
    name: values.name,
    mode: values.mode,
  }),
);

export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
