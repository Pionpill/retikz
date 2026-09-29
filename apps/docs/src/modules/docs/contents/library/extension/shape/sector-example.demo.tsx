import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, sectorExampleControls } from './sector-example.controls';
import { renderSectorExamplePreview } from './sector-example.preview';

export const previewControls = sectorExampleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => renderSectorExamplePreview(values));

export const previewSource = controlledPreview.source;

/** 调整 Sector 的半径、角度和圆角 */
const Demo: FC = controlledPreview.Component;

export default Demo;
