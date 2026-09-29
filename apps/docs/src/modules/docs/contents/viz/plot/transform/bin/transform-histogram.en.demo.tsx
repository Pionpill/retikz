import { defineControlledPreview } from '@/modules/docs/preview';

import { histogramControls, previewControlContract } from './transform-histogram.en.controls';
import { TransformHistogramPreview } from './transform-histogram.preview';

/** 注册回退使用的分箱英文控件 */
export const previewControls = histogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformHistogramPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Binning playground for count, step, and thresholds */
const Preview = controlledPreview.Component;

export default Preview;
