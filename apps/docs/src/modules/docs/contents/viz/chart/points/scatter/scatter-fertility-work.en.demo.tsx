import type { FC } from 'react';

import { Axis, Legend } from '@retikz/plot-react';

import { ScatterChart } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';
import { previewControlContract } from './scatter-fertility-work.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const encoding = values[SCATTER_FERTILITY_WORK_CONTROL_IDS.encoding];

  return (
    <ScatterChart
      data={fertilityWorkData}
      dataModel={[
        { name: 'fertilityRate', type: 'continuous' },
        { name: 'femaleLaborParticipation', type: 'continuous' },
        { name: 'incomeGroup', type: 'categorical' },
      ]}
      encoding={{
        x: { field: 'fertilityRate' },
        y: { field: 'femaleLaborParticipation' },
        ...(encoding === 'color' ? { color: { field: 'incomeGroup' } } : {}),
        ...(encoding === 'shape' ? { shape: { field: 'incomeGroup' } } : {}),
      }}
      mark={{
        size: { kind: 'constant', value: 4.5 },
        opacity: { kind: 'constant', value: 0.65 },
      }}
      title="Fertility and female labor participation"
      subtitle="186 economies in 2022; x shows births per woman and y shows female labor-force participation among people aged 15+ (%)"
      source="World Bank: SP.DYN.TFRT.IN, SL.TLF.CACT.FE.ZS, and income-group metadata; economies with all three observations"
      width={800}
      height={400}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Axis dimension="x" title="Total fertility rate (births per woman)" grid />
      <Axis dimension="y" title="Female labor force participation (%)" grid />
      {encoding === 'color' ? <Legend channel="color" title="World Bank income group" position="right" /> : null}
      {encoding === 'shape' ? <Legend channel="shape" title="World Bank income group" position="right" /> : null}
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
