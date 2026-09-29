import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS, previewControlContract } from './bubble-basic.controls';
import { renderBubbleBasicPreview } from './bubble-basic.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderBubbleBasicPreview(
    {
      coordinateSystem: values[BUBBLE_BASIC_CONTROL_IDS.coordinateSystem],
      xScale: values[BUBBLE_BASIC_CONTROL_IDS.xScale],
      colorByContinent: values[BUBBLE_BASIC_CONTROL_IDS.colorByContinent],
      pointStrokeWidth: values[BUBBLE_BASIC_CONTROL_IDS.pointStrokeWidth],
      pointStrokeEnabled: values[BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled],
      pointStroke: values[BUBBLE_BASIC_CONTROL_IDS.pointStroke],
      pointFillOpacity: values[BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity],
      pointShape: values[BUBBLE_BASIC_CONTROL_IDS.pointShape],
    },
    dimensions,
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示收入、寿命与人口规模关系的基础气泡图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
