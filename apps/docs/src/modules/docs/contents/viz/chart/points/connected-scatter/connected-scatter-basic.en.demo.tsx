import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterProperties,
} from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { CONNECTED_SCATTER_CONTROL_IDS } from './connected-scatter-basic.controls';
import { connectedScatterData } from './connected-scatter-basic.data';
import { previewControlContract } from './connected-scatter-basic.en.controls';

const controlled = defineControlledPreview(previewControlContract, values => (
  <ConnectedScatterChart>
    <ChartData data={connectedScatterData} />
    <ChartLayout {...resolvePointPreviewLayout(values[CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem])} />
    <ChartExtension
      coordinate={
        values[CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem] === 'polar2D'
          ? { type: 'polar2D' }
          : { type: 'cartesian2D' }
      }
    />
    <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
    <ConnectedScatterProperties
      point={{ size: values[CONNECTED_SCATTER_CONTROL_IDS.pointSize] }}
      path={{
        connectNulls: values[CONNECTED_SCATTER_CONTROL_IDS.connectNulls],
        strokeWidth: values[CONNECTED_SCATTER_CONTROL_IDS.strokeWidth],
        ...(values[CONNECTED_SCATTER_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
      }}
    />
    <ChartTitle>Long-term urbanization and life-expectancy trajectories</ChartTitle>
    <ChartSubtitle>
      Six countries at five-year intervals, 1990–2020; urban population share on x and life expectancy at birth on y
    </ChartSubtitle>
    <ChartSource>
      World Bank WDI; static snapshot accessed 2026-08-30 and rounded to one decimal; South Africa 2005 life expectancy
      is null to demonstrate missing-value policy
    </ChartSource>
  </ConnectedScatterChart>
));

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
