import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonEndpointsControls } from './ribbon-endpoints.controls';
import { renderRibbonEndpointsPreview } from './ribbon-endpoints.preview';

export const previewControls = ribbonEndpointsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderRibbonEndpointsPreview(values),
);

export const previewSource = controlledPreview.source;

/** Ribbon 端点方向、对齐与端帽 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
