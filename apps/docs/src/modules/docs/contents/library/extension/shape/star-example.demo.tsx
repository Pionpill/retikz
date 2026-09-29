import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, starExampleControls } from './star-example.controls';
import { renderStarExamplePreview } from './star-example.preview';

export const previewControls = starExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => renderStarExamplePreview(values));

export const previewSource = controlledPreview.source;

/** 调整 Star 的角数、半径、旋转与圆角 */
const Demo: FC = controlledPreview.Component;

export default Demo;
