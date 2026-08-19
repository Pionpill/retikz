import type { FC } from 'react';

import { Axis, Legend } from '@retikz/plot-react';

import { ScatterChart } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

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
      title="生育率与女性劳动参与率"
      subtitle="186 个经济体，2022 年；横轴为每名女性生育数，纵轴为 15 岁及以上女性劳动参与率（%）"
      source="世界银行：SP.DYN.TFRT.IN、SL.TLF.CACT.FE.ZS 与收入组元数据；仅保留三个字段均有观测的经济体"
      width={800}
      height={400}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Axis dimension="x" title="总和生育率（每名女性的生育数）" grid />
      <Axis dimension="y" title="女性劳动参与率（%）" grid />
      {encoding === 'color' ? <Legend channel="color" title="World Bank 收入组" position="right" /> : null}
      {encoding === 'shape' ? <Legend channel="shape" title="World Bank 收入组" position="right" /> : null}
    </ScatterChart>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 比较分类颜色与形状编码的真实数据散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
