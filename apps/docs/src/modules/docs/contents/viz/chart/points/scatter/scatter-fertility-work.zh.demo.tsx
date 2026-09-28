import { ChartData } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { fertilityWorkData } from './scatter-fertility-work.data';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <ScatterChart
      coordinate={
        values[SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem] === 'polar2D'
          ? { type: 'polar2D' }
          : { type: 'cartesian2D' }
      }
      layout={dimensions}
    >
      <ChartData data={fertilityWorkData} />
      <ScatterEncodings
        x="fertilityRate"
        y="femaleLaborParticipation"
        {...(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory] ? { color: 'incomeGroup' } : {})}
        {...(values[SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory] ? { shape: 'incomeGroup' } : {})}
      />
      <ScatterProperties size={5} opacity={0.65} />
    </ScatterChart>
  );
  return chart;
});

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
