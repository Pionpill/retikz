import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_SCATTER_CONTROL_IDS,
  relationScatterControls,
} from './relation-scatter.controls';
import { RelationScatterPreview } from './relation-scatter.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RelationScatterPreview({
    routing: values[RELATION_SCATTER_CONTROL_IDS.routing],
    labelSide: values[RELATION_SCATTER_CONTROL_IDS.labelSide],
    nodeLabelPosition: values[RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition],
    color: values[RELATION_SCATTER_CONTROL_IDS.color],
    opacity: values[RELATION_SCATTER_CONTROL_IDS.opacity],
    strokeWidth: values[RELATION_SCATTER_CONTROL_IDS.strokeWidth],
    labelPosition: values[RELATION_SCATTER_CONTROL_IDS.labelPosition],
    labelSloped: values[RELATION_SCATTER_CONTROL_IDS.labelSloped],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationScatterControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
