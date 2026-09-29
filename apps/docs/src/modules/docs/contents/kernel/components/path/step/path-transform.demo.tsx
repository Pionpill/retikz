import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathTransformControls, previewControlContract } from './path-transform.controls';
import { PathTransformPreview } from './path-transform.preview';

export const previewControls = pathTransformControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathTransformPreview({
    rotate: values.rotate,
    scale: values.scale,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 路径整体变换 playground
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
