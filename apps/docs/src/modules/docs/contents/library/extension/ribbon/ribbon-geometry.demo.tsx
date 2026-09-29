import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonGeometryControls } from './ribbon-geometry.controls';
import { renderRibbonGeometryPreview } from './ribbon-geometry.preview';

export const previewControls = ribbonGeometryControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderRibbonGeometryPreview(values),
);

export const previewSource = controlledPreview.source;

/** Ribbon 宽度与样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
