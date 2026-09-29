import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stepCurvesControls } from './step-curves.controls';
import { StepCurvesPreview } from './step-curves.preview';

export const previewControls = stepCurvesControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => StepCurvesPreview(values));

export const previewSource = controlledPreview.source;

/** Step curve / cubic / bend / smooth / arc / circle / ellipse playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
