import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_INTERRUPTION_CONNECT_NULLS_ID,
  LINE_INTERRUPTION_CONTROL_IDS,
  previewControlContract,
} from './line-interruption.controls';
import { LineInterruptionPreview } from './line-interruption.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineInterruptionPreview({
    coordinate: values[LINE_INTERRUPTION_CONTROL_IDS.coordinate],
    showFill: values[LINE_INTERRUPTION_CONTROL_IDS.showFill],
    connectNulls: values[LINE_INTERRUPTION_CONNECT_NULLS_ID],
    closed: values[LINE_INTERRUPTION_CONTROL_IDS.closed],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
