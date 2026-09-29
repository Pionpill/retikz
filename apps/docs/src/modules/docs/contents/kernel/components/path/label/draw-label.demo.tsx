import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawLabelControls, previewControlContract } from './draw-label.controls';
import { DrawLabelPreview } from './draw-label.preview';

export const previewControls = drawLabelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => DrawLabelPreview(values));

export const previewSource = controlledPreview.source;

/** Draw 边标注 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
