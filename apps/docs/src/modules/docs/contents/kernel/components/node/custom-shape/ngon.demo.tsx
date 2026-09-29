import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { ngonControls, previewControlContract } from './ngon.controls';
import { NgonPreview } from './ngon.preview';

export const previewControls = ngonControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  NgonPreview({
    sides: values.sides,
    scale: values.scale,
    fill: values.fill,
    stroke: values.stroke,
    strokeWidth: values.strokeWidth,
  }),
);

export const previewSource = controlledPreview.source;

/** 参数化 ngon 的 sides 与 Node scale playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
