import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CONNECTED_SCATTER_CONTROL_IDS, previewControlContract } from './connected-scatter-basic.controls';
import { renderConnectedScatterBasicPreview } from './connected-scatter-basic.preview';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderConnectedScatterBasicPreview(
    {
      coordinateSystem: values[CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem],
      colorMode: values[CONNECTED_SCATTER_CONTROL_IDS.colorMode],
      pointSize: values[CONNECTED_SCATTER_CONTROL_IDS.pointSize],
      pointOpacity: values[CONNECTED_SCATTER_CONTROL_IDS.pointOpacity],
      curve: values[CONNECTED_SCATTER_CONTROL_IDS.curve],
      lineOpacity: values[CONNECTED_SCATTER_CONTROL_IDS.lineOpacity],
      connectNulls: values[CONNECTED_SCATTER_CONTROL_IDS.connectNulls],
      strokeWidth: values[CONNECTED_SCATTER_CONTROL_IDS.strokeWidth],
      lineStyle: values[CONNECTED_SCATTER_CONTROL_IDS.lineStyle],
    },
    dimensions,
  ),
);

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};

export const previewControls = previewControlContract.controls;

const Demo: FC = controlled.Component;
export default Demo;
