import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { renderRangedDotBasicPreview } from './ranged-dot-basic.preview';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderRangedDotBasicPreview(
    {
      coordinateSystem: values[RANGED_DOT_CONTROL_IDS.coordinateSystem],
      pointShape: values[RANGED_DOT_CONTROL_IDS.pointShape],
      pointOpacity: values[RANGED_DOT_CONTROL_IDS.pointOpacity],
      pointSize: values[RANGED_DOT_CONTROL_IDS.pointSize],
      customEndpoints: values[RANGED_DOT_CONTROL_IDS.customEndpoints],
      startSize: values[RANGED_DOT_CONTROL_IDS.startSize],
      startColor: values[RANGED_DOT_CONTROL_IDS.startColor],
      endSize: values[RANGED_DOT_CONTROL_IDS.endSize],
      endShape: values[RANGED_DOT_CONTROL_IDS.endShape],
      endColor: values[RANGED_DOT_CONTROL_IDS.endColor],
      lineColor: values[RANGED_DOT_CONTROL_IDS.lineColor],
      strokeWidth: values[RANGED_DOT_CONTROL_IDS.strokeWidth],
      lineStyle: values[RANGED_DOT_CONTROL_IDS.lineStyle],
    },
    dimensions,
  ),
);

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};

export const previewControls = previewControlContract.controls;

const Demo: FC = controlled.Component;
export default Demo;
