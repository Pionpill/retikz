import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stepTargetingControls } from './step-targeting.controls';
import { StepTargetingPreview } from './step-targeting.preview';

export const previewControls = stepTargetingControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => StepTargetingPreview(values));

export const previewSource = controlledPreview.source;

/** Step offset / relative / relativeAccumulate playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
