import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';
import { previewControlContract } from './scatter-fertility-work.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const encoding = values[SCATTER_FERTILITY_WORK_CONTROL_IDS.encoding];

  return (
    <Plot
      data={fertilityWorkData}
      model={[
        { name: 'fertilityRate', type: 'continuous' },
        { name: 'femaleLaborParticipation', type: 'continuous' },
        { name: 'incomeGroup', type: 'categorical' },
      ]}
      width={800}
      height={400}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PointMark
        x="fertilityRate"
        y="femaleLaborParticipation"
        color={encoding === 'color' ? 'incomeGroup' : undefined}
        shape={encoding === 'shape' ? 'incomeGroup' : undefined}
        size={4.5}
        opacity={0.65}
      />
      <Axis dimension="x" title="Total fertility rate (births per woman)" />
      <Axis dimension="y" title="Female labor force participation (%)" />
      {encoding === 'color' ? <Legend channel="color" title="World Bank income group" position="right" /> : null}
      {encoding === 'shape' ? <Legend channel="shape" title="World Bank income group" position="right" /> : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** Compare categorical color and shape encodings with real-world data */
const Demo: FC = controlledPreview.Component;

export default Demo;
