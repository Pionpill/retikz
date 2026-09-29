import { defineControlledPreview } from '@/modules/docs/preview';

import { histogramControls, previewControlContract } from './transform-histogram.controls';
import { TransformHistogramPreview } from './transform-histogram.preview';

/** 注册回退使用的分箱控件 */
export const previewControls = histogramControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformHistogramPreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较 count、step 与 thresholds 的分箱试验场 */
const Preview = controlledPreview.Component;

export default Preview;
