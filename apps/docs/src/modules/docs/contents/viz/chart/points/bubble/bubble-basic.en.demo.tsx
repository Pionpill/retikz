import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS } from './bubble-basic.controls';
import { previewControlContract } from './bubble-basic.en.controls';
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

/** Stable source configuration derived from canonical control state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' },
  },
};

/** Explicit fallback used when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Basic bubble chart comparing income, life expectancy, and population */
const Demo: FC = controlledPreview.Component;

export default Demo;
