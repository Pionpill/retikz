import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  RELATION_SANKEY_CONTROL_IDS,
  relationSankeyControls,
} from './relation-sankey.controls';
import { RelationSankeyPreview } from './relation-sankey.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  RelationSankeyPreview({
    opacity: values[RELATION_SANKEY_CONTROL_IDS.opacity],
    samples: values[RELATION_SANKEY_CONTROL_IDS.samples],
    nodeStrokeWidth: values[RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth],
    nodeLabelPosition: values[RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition],
    nodeLabelDistance: values[RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = relationSankeyControls;

const Demo: FC = controlledPreview.Component;

export default Demo;
