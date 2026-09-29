import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  BAR_SERIES_COORDINATE_ID,
  BAR_SERIES_GAP_ID,
  BAR_SERIES_MODE_ID,
  BAR_SERIES_STACK_OFFSET_ID,
  previewControlContract,
} from './bar-grouped.controls';
import { BarSeriesPreview } from './bar-series.preview';

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  BarSeriesPreview({
    coordinate: values[BAR_SERIES_COORDINATE_ID],
    mode: values[BAR_SERIES_MODE_ID],
    stackOffset: values[BAR_SERIES_STACK_OFFSET_ID],
    gap: values[BAR_SERIES_GAP_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
