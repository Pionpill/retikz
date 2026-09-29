import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { inspectSelectionControls, previewControlContract } from './inspect-selection.controls';
import { InspectSelectionPreview } from './inspect-selection.preview';

export const previewControls = inspectSelectionControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  InspectSelectionPreview({
    target: values.target,
    controlPoints: values.controlPoints,
    labels: values.labels,
    barrierRight: values.barrierRight,
  }),
);

export const previewSource = controlledPreview.source;

/** 比较局部 Path request 与 Scope barrier 的选择结果 */
const Demo: FC = controlledPreview.Component;

export default Demo;
