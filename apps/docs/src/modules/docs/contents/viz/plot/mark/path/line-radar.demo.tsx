import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_RADAR_CLOSED_ID,
  LINE_RADAR_LEFT_COORDINATE_INTERPOLATION_ID,
  LINE_RADAR_RIGHT_COORDINATE_INTERPOLATION_ID,
  previewControlContract,
} from './line-radar.controls';
import { LineRadarPreview } from './line-radar.preview';

/** 几何属性：两个极坐标对比闭合路径与不闭合路径。 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineRadarPreview({
    leftCoordinateInterpolation: values[LINE_RADAR_LEFT_COORDINATE_INTERPOLATION_ID],
    rightCoordinateInterpolation: values[LINE_RADAR_RIGHT_COORDINATE_INTERPOLATION_ID],
    closed: values[LINE_RADAR_CLOSED_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
