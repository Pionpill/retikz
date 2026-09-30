import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './ribbon-endpoints.controls';
import { renderRibbonEndpointsPreview } from './ribbon-endpoints.preview';

export { createPreviewControlContract } from './ribbon-endpoints.controls';
export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderRibbonEndpointsPreview(values),
);

export const previewSource = controlledPreview.source;

/** Ribbon 对齐与端帽 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
