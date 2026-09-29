import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { circleConstructionsControls, previewControlContract } from './circle-constructions.controls';
import { CircleConstructionsPreview } from './circle-constructions.preview';

export const previewControls = circleConstructionsControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  CircleConstructionsPreview({
    triangleA: values.triangleA,
    triangleB: values.triangleB,
    triangleC: values.triangleC,
    pointA: values.pointA,
    pointB: values.pointB,
    pointC: values.pointC,
    pointD: values.pointD,
    pointE: values.pointE,
    scheme: values.scheme,
  }),
);

export const previewSource = controlledPreview.source;

/** 受控比较三种圆构造方案 */
const Demo: FC = controlledPreview.Component;

export default Demo;
