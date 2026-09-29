import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_FERTILITY_WORK_CONTROL_IDS } from './scatter-fertility-work.controls';
import { renderScatterFertilityWorkPreview } from './scatter-fertility-work.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderScatterFertilityWorkPreview({
    layout: dimensions,
    coordinateSystem:
      values[SCATTER_FERTILITY_WORK_CONTROL_IDS.coordinateSystem] === 'polar2D' ? 'polar2D' : 'cartesian2D',
    colorByCategory: values[SCATTER_FERTILITY_WORK_CONTROL_IDS.colorByCategory],
    shapeByCategory: values[SCATTER_FERTILITY_WORK_CONTROL_IDS.shapeByCategory],
  }),
);

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
