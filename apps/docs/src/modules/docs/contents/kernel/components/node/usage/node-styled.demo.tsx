import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { nodeStyledControls, previewControlContract } from './node-styled.controls';
import { NodeStyledPreview } from './node-styled.preview';

export const previewControls = nodeStyledControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NodeStyledPreview({
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    dashed: values.dashed,
    opacity: values.opacity,
    fontFamily: values.fontFamily,
    fontSize: values.fontSize,
    fontWeight: values.fontWeight,
    fontStyle: values.fontStyle,
  }),
);

export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
