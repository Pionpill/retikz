import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  nodeConnectionPlaygroundControls,
  previewControlContract,
} from './rectangle-node-connection-playground.controls';
import { RectangleNodeConnectionPlaygroundPreview } from './rectangle-node-connection-playground.preview';

export const previewControls = nodeConnectionPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RectangleNodeConnectionPlaygroundPreview({
    sourceAngle: values.sourceAngle,
    sourceDistance: values.sourceDistance,
    cornerRadius: values.cornerRadius,
    anchor: values.anchor,
    anchorAngle: values.anchorAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** 矩形节点的连接端点 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
