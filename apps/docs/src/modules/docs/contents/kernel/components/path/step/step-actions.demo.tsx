import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stepActionsControls } from './step-actions.controls';
import { StepActionsPreview } from './step-actions.preview';

export const previewControls = stepActionsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => StepActionsPreview(values));

export const previewSource = controlledPreview.source;

/** Step line / fold / cycle / rectangle playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
