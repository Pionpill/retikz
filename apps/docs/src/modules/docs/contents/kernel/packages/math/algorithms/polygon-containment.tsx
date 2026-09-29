import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polygonContainmentControls, previewControlContract } from './polygon-containment.controls';
import { PolygonContainmentPreview } from './polygon-containment.preview';

export const previewControls = polygonContainmentControls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PolygonContainmentPreview({
    shape: values.shape,
    testPointA: values.testPointA,
    testPointB: values.testPointB,
    testPointC: values.testPointC,
  }),
);

export const previewSource = controlledPreview.source;

/** 受控展示多个可移动测试点、多边形包含判断与凸包 */
const Demo: FC = controlledPreview.Component;

export default Demo;
