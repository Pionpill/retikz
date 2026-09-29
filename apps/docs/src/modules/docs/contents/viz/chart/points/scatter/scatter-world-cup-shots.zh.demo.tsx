import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { renderScatterWorldCupShotsPreview } from './scatter-world-cup-shots.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderScatterWorldCupShotsPreview({
    lang: 'zh',
    layout: dimensions,
    pointSize: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize],
    pointStroke: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]
      ? values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke]
      : undefined,
    pointShape: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape],
    pointOpacity: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity],
  }),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'messiWorldCupShots', from: './scatter-world-cup-shots.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在 StatsBomb 空间坐标中展示射门起点与结果颜色 */
const Demo: FC = controlledPreview.Component;

export default Demo;
