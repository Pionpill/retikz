import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { curveSegmentsControls, previewControlContract } from './curve-segments.controls';
import { CurveSegmentsPreview } from './curve-segments.preview';

export const previewControls = curveSegmentsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CurveSegmentsPreview({
    kind: values.kind,
    sliceStart: values.sliceStart,
    sliceEnd: values.sliceEnd,
    sampleParameter: values.sampleParameter,
  }),
);

export const previewSource = controlledPreview.source;

/** 切换曲线段类型，观察参数采样与保形切片 */
const Demo: FC = controlledPreview.Component;

export default Demo;
