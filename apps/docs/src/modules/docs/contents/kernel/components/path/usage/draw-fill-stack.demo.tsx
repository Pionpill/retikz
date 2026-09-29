import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawFillStackControls, previewControlContract } from './draw-fill-stack.controls';
import { DrawFillStackPreview } from './draw-fill-stack.preview';

export const previewControls = drawFillStackControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  DrawFillStackPreview({
    zIndexA: values.zIndexA,
    fillA: values.fillA,
    fillOpacity: values.fillOpacity,
    fillB: values.fillB,
  }),
);

export const previewSource = controlledPreview.source;

/** Draw 闭合填充与栈序 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
