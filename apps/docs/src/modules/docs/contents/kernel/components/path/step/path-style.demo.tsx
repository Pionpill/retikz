import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathStyleControls, previewControlContract } from './path-style.controls';
import { PathStylePreview } from './path-style.preview';

export const previewControls = pathStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathStylePreview({
    thickness: values.thickness,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
    dashed: values.dashed,
    dashOffset: values.dashOffset,
    lineCap: values.lineCap,
    lineJoin: values.lineJoin,
    opacity: values.opacity,
    strokeOpacity: values.strokeOpacity,
  }),
);

export const previewSource = controlledPreview.source;

/** Path 描边与透明度 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
