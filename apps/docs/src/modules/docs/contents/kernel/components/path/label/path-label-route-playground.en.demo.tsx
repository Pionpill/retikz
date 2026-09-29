import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract as createEnglishPreviewContract } from './path-label-route-playground.controls';
import { PathLabelRoutePlaygroundPreview } from './path-label-route-playground.preview';

const pathLabelRoutePlaygroundControls = createEnglishPreviewContract('en').controls;
const previewControlContract = createEnglishPreviewContract('en');

export const previewControls = pathLabelRoutePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathLabelRoutePlaygroundPreview(values, 'en'),
);

export const previewSource = controlledPreview.source;

/** Path label route and position playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
