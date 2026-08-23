import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData } from './scatter-basic.data';

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
    <ChartTitle>城市化程度与互联网使用率</ChartTitle>
    <ChartSubtitle>181 个经济体，2023 年；横轴和纵轴均为人口占比（%）</ChartSubtitle>
    <ChartSource>世界银行：SP.URB.TOTL.IN.ZS、IT.NET.USER.ZS；仅保留两个指标均有 2023 年观测的经济体</ChartSource>
    <ScatterMark
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
