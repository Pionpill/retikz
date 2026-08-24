import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData } from './scatter-basic.data';
import { previewControlContract } from './scatter-basic.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encodings={{
      x: 'urbanPopulationShare',
      y: 'internetUseShare',
    }}
    width={800}
    height={400}
  >
    <ChartTitle>Urbanization and Internet use</ChartTitle>
    <ChartSubtitle>181 economies in 2023; both axes show the share of population (%)</ChartSubtitle>
    <ChartSource>
      World Bank: SP.URB.TOTL.IN.ZS and IT.NET.USER.ZS; economies with observations for both indicators in 2023
    </ChartSource>
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_BASIC_CONTROL_IDS.pointSize],
        opacity: values[SCATTER_BASIC_CONTROL_IDS.pointOpacity],
      }}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'countryScatterData', from: './scatter-basic.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示城市化与互联网普及关系的基础散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
