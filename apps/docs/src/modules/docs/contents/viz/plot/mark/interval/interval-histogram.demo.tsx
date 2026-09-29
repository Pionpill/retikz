import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  INTERVAL_CONTINUOUS_COORDINATE_ID,
  INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID,
  INTERVAL_CONTINUOUS_MODE_ID,
  INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID,
  INTERVAL_HISTOGRAM_COUNT_ID,
  intervalHistogramControls,
  previewControlContract,
} from './interval-histogram.controls';
import { IntervalHistogramPreview } from './interval-histogram.preview';

/** 注册回退使用的连续区间 controls */
export const previewControls = intervalHistogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  IntervalHistogramPreview({
    continuousCoordinate: values[INTERVAL_CONTINUOUS_COORDINATE_ID],
    continuousHorizontalPadding: values[INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID],
    continuousVerticalPadding: values[INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID],
    continuousMode: values[INTERVAL_CONTINUOUS_MODE_ID],
    count: values[INTERVAL_HISTOGRAM_COUNT_ID],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
