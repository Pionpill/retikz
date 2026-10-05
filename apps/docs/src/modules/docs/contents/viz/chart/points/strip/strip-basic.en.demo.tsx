import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { STRIP_BASIC_CONTROL_IDS } from './strip-basic.controls';
import { previewControlContract } from './strip-basic.en.controls';
import { renderStripBasicPreview } from './strip-basic.preview';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderStripBasicPreview(
    {
      coordinateSystem: values[STRIP_BASIC_CONTROL_IDS.coordinateSystem],
      jitterSpan: values[STRIP_BASIC_CONTROL_IDS.jitterSpan],
      distribution: values[STRIP_BASIC_CONTROL_IDS.distribution],
      normalSigma: values[STRIP_BASIC_CONTROL_IDS.normalSigma],
      seed: values[STRIP_BASIC_CONTROL_IDS.seed],
      pointSize: values[STRIP_BASIC_CONTROL_IDS.pointSize],
      pointOpacity: values[STRIP_BASIC_CONTROL_IDS.pointOpacity],
    },
    dimensions,
  ),
);

export const previewSource = {
  ...controlled.source,
  datasetImports: {
    'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' },
  },
};

export const previewControls = previewControlContract.controls;

const Demo: FC = controlled.Component;
export default Demo;
