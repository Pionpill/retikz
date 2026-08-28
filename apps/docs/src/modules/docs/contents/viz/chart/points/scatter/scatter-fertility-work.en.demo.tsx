import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';
import { previewControlContract } from './scatter-fertility-work.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    theme={{
      tokens: {
        plot: {
          'plot.palette.shape': [
            'circle',
            'rectangle',
            'diamond',
            { type: 'polygon', params: { sides: 3, rotate: -90 } },
          ],
        },
      },
    }}
  >
    <ChartData data={fertilityWorkData} />
    <ChartLayout width={800} height={500} />
    <ScatterEncodings x="fertilityRate" y="femaleLaborParticipation" color="incomeGroup" shape="incomeGroup" />
    <ChartTitle>Fertility and female labor participation</ChartTitle>
    <ChartSubtitle>
      186 economies in 2022; x shows births per woman and y shows female labor-force participation among people aged 15+
      (%)
    </ChartSubtitle>
    <ChartSource>
      World Bank: SP.DYN.TFRT.IN, SL.TLF.CACT.FE.ZS, and income-group metadata; economies with all three observations
    </ChartSource>
    <ScatterProperties
      size={values[SCATTER_FERTILITY_WORK_CONTROL_IDS.pointSize]}
      {...(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.pointStrokeEnabled]
        ? { stroke: values[SCATTER_FERTILITY_WORK_CONTROL_IDS.pointStroke] }
        : {})}
      opacity={values[SCATTER_FERTILITY_WORK_CONTROL_IDS.pointOpacity]}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'fertilityWorkData', from: './scatter-fertility-work.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** Apply categorical color and shape encodings together with real-world data */
const Demo: FC = controlledPreview.Component;

export default Demo;
