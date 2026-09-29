import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_REGION_CONTROL_IDS } from './rule-region.controls';
import { RuleRegionPreview } from './rule-region.preview';

/** 参考区域：同一组 x / y 上下界在笛卡尔与极坐标下投影为矩形或环扇区 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RuleRegionPreview({
    coordinate: values[RULE_REGION_CONTROL_IDS.coordinate],
    xStart: values[RULE_REGION_CONTROL_IDS.xStart],
    xEnd: values[RULE_REGION_CONTROL_IDS.xEnd],
    yStart: values[RULE_REGION_CONTROL_IDS.yStart],
    yEnd: values[RULE_REGION_CONTROL_IDS.yEnd],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
