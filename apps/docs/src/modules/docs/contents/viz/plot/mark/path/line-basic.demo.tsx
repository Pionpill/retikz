import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_BASIC_CONTROL_IDS, previewControlContract } from './line-basic.controls';
import { LineBasicPreview } from './line-basic.preview';

/** 使用同一组位置通道切换笛卡尔与极坐标投影 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineBasicPreview({
    coordinate: values[LINE_BASIC_CONTROL_IDS.coordinate],
    xField: values[LINE_BASIC_CONTROL_IDS.xField],
    yField: values[LINE_BASIC_CONTROL_IDS.yField],
    orderSource: values[LINE_BASIC_CONTROL_IDS.orderSource],
    closed: values[LINE_BASIC_CONTROL_IDS.closed],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
