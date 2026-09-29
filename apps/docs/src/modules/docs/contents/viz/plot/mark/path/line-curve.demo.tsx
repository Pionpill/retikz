import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  PATH_CURVE_CONTROL_ID,
  PATH_CURVE_CONTROL_IDS,
  PATH_CURVE_SHOW_POINTS_ID,
  previewControlContract,
} from './line-curve.controls';
import { LineCurvePreview } from './line-curve.preview';

/** 在固定数据与路径拓扑下比较连接方式和描边样式 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineCurvePreview({
    coordinate: values[PATH_CURVE_CONTROL_IDS.coordinate],
    pathCurveControl: values[PATH_CURVE_CONTROL_ID],
    pathCurveShowPoints: values[PATH_CURVE_SHOW_POINTS_ID],
    closed: values[PATH_CURVE_CONTROL_IDS.closed],
    stroke: values[PATH_CURVE_CONTROL_IDS.stroke],
    strokeWidth: values[PATH_CURVE_CONTROL_IDS.strokeWidth],
    dashed: values[PATH_CURVE_CONTROL_IDS.dashed],
    opacity: values[PATH_CURVE_CONTROL_IDS.opacity],
  }),
);

export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 路径连接与样式 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
