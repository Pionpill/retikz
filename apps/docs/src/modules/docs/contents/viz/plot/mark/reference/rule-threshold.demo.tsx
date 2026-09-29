import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RULE_THRESHOLD_AXIS_ID,
  RULE_THRESHOLD_COORDINATE_ID,
  RULE_THRESHOLD_VALUE_ID,
} from './rule-threshold.controls';
import { RuleThresholdPreview } from './rule-threshold.preview';

/** 固定参考线：坐标系决定 line 的投影，参考轴决定直线、圆环或径向线形态 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RuleThresholdPreview({
    coordinate: values[RULE_THRESHOLD_COORDINATE_ID],
    axis: values[RULE_THRESHOLD_AXIS_ID],
    value: values[RULE_THRESHOLD_VALUE_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
