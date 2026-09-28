import { ChartData } from '@retikz/chart-react';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterProperties,
} from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CONNECTED_SCATTER_CONTROL_IDS, previewControlContract } from './connected-scatter-basic.controls';
import { connectedScatterData } from './connected-scatter-basic.data';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <ConnectedScatterChart
      coordinate={
        values[CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem] === 'polar2D'
          ? { type: 'polar2D' }
          : { type: 'cartesian2D' }
      }
      layout={dimensions ? { ...dimensions, padding: { right: 48 } } : undefined}
    >
      <ChartData data={connectedScatterData} />
      <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
      <ConnectedScatterProperties
        colorMode={values[CONNECTED_SCATTER_CONTROL_IDS.colorMode]}
        point={{
          size: values[CONNECTED_SCATTER_CONTROL_IDS.pointSize],
          opacity: values[CONNECTED_SCATTER_CONTROL_IDS.pointOpacity],
        }}

        path={{
          curve: values[CONNECTED_SCATTER_CONTROL_IDS.curve],
          ...(values[CONNECTED_SCATTER_CONTROL_IDS.colorMode] === 'muted'
            ? {}
            : { strokeOpacity: values[CONNECTED_SCATTER_CONTROL_IDS.lineOpacity] }),
          connectNulls: values[CONNECTED_SCATTER_CONTROL_IDS.connectNulls],
          strokeWidth: values[CONNECTED_SCATTER_CONTROL_IDS.strokeWidth],
          ...(values[CONNECTED_SCATTER_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
        }}
      />
    </ConnectedScatterChart>
  );
  return chart;
});

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
