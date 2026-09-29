import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { drawCurveControls, previewControlContract } from './draw-curve.controls';
import { DrawCurvePreview } from './draw-curve.preview';

export const previewControls = drawCurveControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => DrawCurvePreview(values));

export const previewSource = controlledPreview.source;

/** Draw 曲线操作 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
