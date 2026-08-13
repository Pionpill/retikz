import type { FC } from 'react';

import { ScatterChart } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { countryScatterData } from './scatter-basic.data';
import { previewControlContract } from './scatter-basic.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={countryScatterData}
    encoding={{
      x: { field: 'urbanPopulationShare' },
      y: { field: 'internetUseShare' },
    }}
    mark={{
      size: { kind: 'constant', value: values[SCATTER_BASIC_CONTROL_IDS.pointSize] },
      opacity: { kind: 'constant', value: values[SCATTER_BASIC_CONTROL_IDS.pointOpacity] },
    }}
    title="Urbanization and Internet use"
    subtitle="181 economies in 2023; both axes show the share of population (%)"
    source="World Bank: SP.URB.TOTL.IN.ZS and IT.NET.USER.ZS; economies with observations for both indicators in 2023"
    width={800}
    height={400}
    style={{ maxWidth: '100%', height: 'auto' }}
  />
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
