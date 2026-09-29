import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_SERIES_CONTROL_IDS, previewControlContract } from './line-series.controls';
import { LineSeriesPreview } from './line-series.preview';

/** 比较显式 series 与分类 color 触发的隐式路径拆分 */
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  LineSeriesPreview({
    coordinate: values[LINE_SERIES_CONTROL_IDS.coordinate],
    grouping: values[LINE_SERIES_CONTROL_IDS.grouping],
    showLabels: values[LINE_SERIES_CONTROL_IDS.showLabels],
    closed: values[LINE_SERIES_CONTROL_IDS.closed],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
