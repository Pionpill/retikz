import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  nodeConnectionPlaygroundControls,
  previewControlContract,
} from './circle-ellipse-node-connection-playground.controls';
import { CircleEllipseNodeConnectionPlaygroundPreview } from './circle-ellipse-node-connection-playground.preview';

export const previewControls = nodeConnectionPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CircleEllipseNodeConnectionPlaygroundPreview({
    sourceAngle: values.sourceAngle,
    sourceDistance: values.sourceDistance,
    shape: values.shape,
    anchor: values.anchor,
    anchorAngle: values.anchorAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** 圆与椭圆节点的连接端点 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
