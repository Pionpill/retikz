import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    coordinate={
      values[SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem] === 'polar2D'
        ? { type: 'polar2D' }
        : { type: 'cartesian2D' }
    }
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
    <ChartLayout {...resolvePointPreviewLayout(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem])} />
    <ScatterEncodings
      x="fertilityRate"
      y="femaleLaborParticipation"
      {...(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory] ? { color: 'incomeGroup' } : {})}
      {...(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory] ? { shape: 'incomeGroup' } : {})}
    />
    <ChartTitle>生育率与女性劳动参与率</ChartTitle>
    <ChartSubtitle>186 个经济体，2022 年；横轴为每名女性生育数，纵轴为 15 岁及以上女性劳动参与率（%）</ChartSubtitle>
    <ChartSource>
      世界银行：SP.DYN.TFRT.IN、SL.TLF.CACT.FE.ZS 与收入组元数据；仅保留三个字段均有观测的经济体
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

/** 同时使用分类颜色与形状编码的真实数据散点图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
