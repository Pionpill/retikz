import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';
import { previewControlContract } from './scatter-fertility-work.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const channel = values[SCATTER_FERTILITY_WORK_CONTROL_IDS.channel];

  return (
    <ScatterChart
      data={fertilityWorkData}
      dataModel={[
        { name: 'fertilityRate', type: 'continuous' },
        { name: 'femaleLaborParticipation', type: 'continuous' },
        { name: 'incomeGroup', type: 'categorical' },
      ]}
      encodings={{
        x: 'fertilityRate',
        y: 'femaleLaborParticipation',
        ...(channel === 'color' ? { color: 'incomeGroup' } : {}),
        ...(channel === 'shape' ? { shape: 'incomeGroup' } : {}),
      }}
      width={800}
      height={400}
    >
      <ChartTitle>Fertility and female labor participation</ChartTitle>
      <ChartSubtitle>
        186 economies in 2022; x shows births per woman and y shows female labor-force participation among people aged
        15+ (%)
      </ChartSubtitle>
      <ChartSource>
        World Bank: SP.DYN.TFRT.IN, SL.TLF.CACT.FE.ZS, and income-group metadata; economies with all three observations
      </ChartSource>
      <ScatterMark properties={{ size: 4.5, opacity: 0.65 }} />
    </ScatterChart>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** Compare categorical color and shape encodings with real-world data */
const Demo: FC = controlledPreview.Component;

export default Demo;
