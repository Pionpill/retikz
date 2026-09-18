import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { renderPathLabelRoutePlayground } from './path-label-route-playground';
import { createPreviewControlContract as createEnglishPreviewContract } from './path-label-route-playground.controls';
const pathLabelRoutePlaygroundControls = createEnglishPreviewContract('en').controls;
const previewControlContract = createEnglishPreviewContract('en');

export const previewControls = pathLabelRoutePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderPathLabelRoutePlayground(values, { source: 'source', target: 'target', label: 'label' }),
);

export const previewSource = controlledPreview.source;

/** Path label route and position playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
