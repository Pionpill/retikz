import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_CLOSURE_BASELINE_ID,
  LINE_CLOSURE_CONTROL_IDS,
  LINE_CLOSURE_HORIZONTAL_PADDING_ID,
  LINE_CLOSURE_VERTICAL_PADDING_ID,
  previewControlContract,
} from './line-closure.controls';
import { LineClosurePreview } from './line-closure.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineClosurePreview({
    coordinate: values[LINE_CLOSURE_CONTROL_IDS.coordinate],
    mode: values[LINE_CLOSURE_CONTROL_IDS.mode],
    baseline: values[LINE_CLOSURE_BASELINE_ID],
    horizontalPadding: values[LINE_CLOSURE_HORIZONTAL_PADDING_ID],
    verticalPadding: values[LINE_CLOSURE_VERTICAL_PADDING_ID],
    closed: values[LINE_CLOSURE_CONTROL_IDS.closed],
    fillOpacity: values[LINE_CLOSURE_CONTROL_IDS.fillOpacity],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
