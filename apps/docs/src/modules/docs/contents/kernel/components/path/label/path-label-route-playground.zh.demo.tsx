import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathLabelRoutePlaygroundControls, previewControlContract } from './path-label-route-playground.controls';
import { PathLabelRoutePlaygroundPreview } from './path-label-route-playground.preview';

export const previewControls = pathLabelRoutePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathLabelRoutePlaygroundPreview(values, 'zh'),
);

export const previewSource = controlledPreview.source;

/** Path 标签路线与位置 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
