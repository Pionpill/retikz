import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { POINT_STYLE_CONTROL_IDS, previewControlContract } from './point-style.controls';
import { PointStylePreview } from './point-style.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PointStylePreview({
    dashOffset: values[POINT_STYLE_CONTROL_IDS.dashOffset],
    lineCap: values[POINT_STYLE_CONTROL_IDS.lineCap],
    lineJoin: values[POINT_STYLE_CONTROL_IDS.lineJoin],
    shape: values[POINT_STYLE_CONTROL_IDS.shape],
    weight: values[POINT_STYLE_CONTROL_IDS.weight],
    scalarOpacity: values[POINT_STYLE_CONTROL_IDS.scalarOpacity],
    paintMode: values[POINT_STYLE_CONTROL_IDS.paintMode],
    fill: values[POINT_STYLE_CONTROL_IDS.fill],
    stroke: values[POINT_STYLE_CONTROL_IDS.stroke],
    strokeWidth: values[POINT_STYLE_CONTROL_IDS.strokeWidth],
    fillOpacity: values[POINT_STYLE_CONTROL_IDS.fillOpacity],
    strokeOpacity: values[POINT_STYLE_CONTROL_IDS.strokeOpacity],
    opacity: values[POINT_STYLE_CONTROL_IDS.opacity],
    size: values[POINT_STYLE_CONTROL_IDS.size],
    sizeMode: values[POINT_STYLE_CONTROL_IDS.sizeMode],
    minimumSize: values[POINT_STYLE_CONTROL_IDS.minimumSize],
    dashed: values[POINT_STYLE_CONTROL_IDS.dashed],
    shadow: values[POINT_STYLE_CONTROL_IDS.shadow],
    dotted: values[POINT_STYLE_CONTROL_IDS.dotted],
    dashPattern: values[POINT_STYLE_CONTROL_IDS.dashPattern],
    blendMode: values[POINT_STYLE_CONTROL_IDS.blendMode],
    zIndex: values[POINT_STYLE_CONTROL_IDS.zIndex],
    coordinate: values[POINT_STYLE_CONTROL_IDS.coordinate],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 点的 paint、透明度、大小与描边 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
