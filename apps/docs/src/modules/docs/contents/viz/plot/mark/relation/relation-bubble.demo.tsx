import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_BUBBLE_CONTROL_IDS,
  relationBubbleControls,
} from './relation-bubble.controls';
import { RelationBubblePreview } from './relation-bubble.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RelationBubblePreview({
    labelSide: values[RELATION_BUBBLE_CONTROL_IDS.labelSide],
    nodeLabelPosition: values[RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition],
    nodeOpacity: values[RELATION_BUBBLE_CONTROL_IDS.nodeOpacity],
    color: values[RELATION_BUBBLE_CONTROL_IDS.color],
    strokeWidth: values[RELATION_BUBBLE_CONTROL_IDS.strokeWidth],
    labelPosition: values[RELATION_BUBBLE_CONTROL_IDS.labelPosition],
    labelSloped: values[RELATION_BUBBLE_CONTROL_IDS.labelSloped],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationBubbleControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
