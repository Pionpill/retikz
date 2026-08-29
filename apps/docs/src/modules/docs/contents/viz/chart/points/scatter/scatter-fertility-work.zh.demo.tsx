import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const channel = values[SCATTER_FERTILITY_WORK_CONTROL_IDS.channel];

  return (
    <ScatterChart
      data={fertilityWorkData}
      encodings={{
        x: 'fertilityRate',
        y: 'femaleLaborParticipation',
        ...(channel === 'color' ? { color: 'incomeGroup' } : {}),
        ...(channel === 'shape' ? { shape: 'incomeGroup' } : {}),
      }}
      layout={{ width: 800, height: 500 }}
      width={800}
      height={500}
    >
      <ChartTitle>生育率与女性劳动参与率</ChartTitle>
      <ChartSubtitle>186 个经济体，2022 年；横轴为每名女性生育数，纵轴为 15 岁及以上女性劳动参与率（%）</ChartSubtitle>
      <ChartSource>
        世界银行：SP.DYN.TFRT.IN、SL.TLF.CACT.FE.ZS 与收入组元数据；仅保留三个字段均有观测的经济体
      </ChartSource>
      <ScatterMark override properties={{ size: 4.5, opacity: 0.65 }} />
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
