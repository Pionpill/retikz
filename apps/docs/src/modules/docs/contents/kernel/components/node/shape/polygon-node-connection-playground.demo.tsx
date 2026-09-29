import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  nodeConnectionPlaygroundControls,
  previewControlContract,
} from './polygon-node-connection-playground.controls';
import { PolygonNodeConnectionPlaygroundPreview } from './polygon-node-connection-playground.preview';

export const previewControls = nodeConnectionPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PolygonNodeConnectionPlaygroundPreview({
    sourceAngle: values.sourceAngle,
    sourceDistance: values.sourceDistance,
    shape: values.shape,
    cornerRadius: values.cornerRadius,
    anchor: values.anchor,
    anchorAngle: values.anchorAngle,
  }),
);

export const previewSource = controlledPreview.source;

/** Polygon 节点的连接端点 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
