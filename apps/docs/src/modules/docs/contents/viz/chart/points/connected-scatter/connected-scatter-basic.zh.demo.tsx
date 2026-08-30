import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterProperties,
} from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CONNECTED_SCATTER_CONTROL_IDS, previewControlContract } from './connected-scatter-basic.controls';
import { connectedScatterData } from './connected-scatter-basic.data';

const controlled = defineControlledPreview(previewControlContract, values => (
  <ConnectedScatterChart>
    <ChartData data={connectedScatterData} />
    <ChartLayout width={800} height={500} />
    <ConnectedScatterEncodings x="urbanization" y="lifeExpectancy" order="year" series="country" />
    <ConnectedScatterProperties
      point={{ size: values[CONNECTED_SCATTER_CONTROL_IDS.pointSize] }}
      path={{
        connectNulls: values[CONNECTED_SCATTER_CONTROL_IDS.connectNulls],
        strokeWidth: values[CONNECTED_SCATTER_CONTROL_IDS.strokeWidth],
        ...(values[CONNECTED_SCATTER_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
      }}
    />
    <ChartTitle>城镇化与预期寿命的长期轨迹</ChartTitle>
    <ChartSubtitle>六个国家，1990–2020 每五年一条观测；横轴为城镇化率，纵轴为出生时预期寿命</ChartSubtitle>
    <ChartSource>
      World Bank WDI；2026-08-30 静态快照，数值保留一位小数；南非 2005 年预期寿命置空以展示缺值策略
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
