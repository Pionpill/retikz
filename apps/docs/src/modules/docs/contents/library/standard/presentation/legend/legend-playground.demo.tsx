import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { legendPlaygroundControls, previewControlContract } from './legend-playground.controls';
import { LegendPlaygroundPreview } from './legend-playground.preview';

export const previewControls = legendPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, LegendPlaygroundPreview);

export const previewSource = controlledPreview.source;

/** Legend 排列、换行、对齐、间距与溢出 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
