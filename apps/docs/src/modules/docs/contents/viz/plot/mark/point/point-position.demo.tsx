import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { POINT_POSITION_CONTROL_IDS, previewControlContract } from './point-position.controls';
import { PointPositionPreview } from './point-position.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  PointPositionPreview({
    coordinate: values[POINT_POSITION_CONTROL_IDS.coordinate],
    xField: values[POINT_POSITION_CONTROL_IDS.xField],
    yField: values[POINT_POSITION_CONTROL_IDS.yField],
    colorMode: values[POINT_POSITION_CONTROL_IDS.colorMode],
    sizeMode: values[POINT_POSITION_CONTROL_IDS.sizeMode],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 使用 x / y 位置通道绘制基础散点 */
const Demo: FC = controlledPreview.Component;

export default Demo;
