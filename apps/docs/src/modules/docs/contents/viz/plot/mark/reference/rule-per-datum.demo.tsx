import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RULE_PER_DATUM_COORDINATE_ID,
  RULE_PER_DATUM_OFFSET_ID,
} from './rule-per-datum.controls';
import { RulePerDatumPreview } from './rule-per-datum.preview';

/** per-datum 阈值线：y 绑 threshold 字段（字符串 → field，每行一条水平 rule），color 绑 tier 字段按类别上色 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RulePerDatumPreview({
    offset: values[RULE_PER_DATUM_OFFSET_ID],
    coordinate: values[RULE_PER_DATUM_COORDINATE_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
