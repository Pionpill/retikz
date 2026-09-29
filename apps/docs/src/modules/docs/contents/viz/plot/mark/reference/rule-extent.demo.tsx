import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RULE_EXTENT_COORDINATE_ID, RULE_EXTENT_INSET_ID } from './rule-extent.controls';
import { RuleExtentPreview } from './rule-extent.preview';

/** 用逐行字段限制参考线在对侧轴上的起止范围 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RuleExtentPreview({
    inset: values[RULE_EXTENT_INSET_ID],
    coordinate: values[RULE_EXTENT_COORDINATE_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
