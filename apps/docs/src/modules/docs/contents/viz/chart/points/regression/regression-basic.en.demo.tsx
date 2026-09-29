import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { previewControlContract } from './regression-basic.en.controls';
import { renderRegressionBasicPreview } from './regression-basic.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderRegressionBasicPreview(
    {
      coordinateSystem: values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem],
      groupBySpecies: values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
      pointSize: values[REGRESSION_BASIC_CONTROL_IDS.pointSize],
      pointOpacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity],
      method: values[REGRESSION_BASIC_CONTROL_IDS.method],
      order: values[REGRESSION_BASIC_CONTROL_IDS.order],
      sampleCount: values[REGRESSION_BASIC_CONTROL_IDS.sampleCount],
      trendStrokeColor: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
      trendLineStyle: values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
      trendStrokeWidth: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
      trendStrokeOpacity: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
    },
    dimensions,
  ),
);

/** Stable source configuration derived from canonical control state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' },
  },
};

/** Explicit fallback used when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Basic Regression chart showing Iris observations and grouped trends */
const Demo: FC = controlledPreview.Component;

export default Demo;
