import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_BAND_CONTROL_IDS } from './rule-band.controls';
import { RuleBandPreview } from './rule-band.preview';

/** 参考带：同一轴区间在笛卡尔与极坐标下投影为带、环带或扇形楔 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RuleBandPreview({
    coordinate: values[RULE_BAND_CONTROL_IDS.coordinate],
    axis: values[RULE_BAND_CONTROL_IDS.axis],
    start: values[RULE_BAND_CONTROL_IDS.start],
    end: values[RULE_BAND_CONTROL_IDS.end],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
