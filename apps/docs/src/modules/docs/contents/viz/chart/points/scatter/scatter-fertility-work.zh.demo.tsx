import type { FC } from 'react';

import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

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
      <Axis dimension="x" title="总和生育率（每名女性的生育数）" />
      <Axis dimension="y" title="女性劳动参与率（%）" />
      {encoding === 'color' ? <Legend channel="color" title="World Bank 收入组" position="right" /> : null}
      {encoding === 'shape' ? <Legend channel="shape" title="World Bank 收入组" position="right" /> : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 比较分类颜色与形状编码的真实数据散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
