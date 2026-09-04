import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { renderPathLabelRoutePlayground } from './path-label-route-playground';
import { pathLabelRoutePlaygroundControls, previewControlContract } from './path-label-route-playground.controls';

export const previewControls = pathLabelRoutePlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderPathLabelRoutePlayground(values, { source: '起点', target: '终点', label: '标签' }),
);

export const previewSource = controlledPreview.source;

/** Path 标签路线与位置 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
