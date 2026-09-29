import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pathMarksControls, previewControlContract } from './path-marks.controls';
import { PathMarksPreview } from './path-marks.preview';

export const previewControls = pathMarksControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PathMarksPreview({
    firstPosition: values.firstPosition,
    secondPosition: values.secondPosition,
  }),
);

export const previewSource = controlledPreview.source;

/**
 * 中段 marking 位置 playground
 */
const Demo: FC = controlledPreview.Component;

export default Demo;
