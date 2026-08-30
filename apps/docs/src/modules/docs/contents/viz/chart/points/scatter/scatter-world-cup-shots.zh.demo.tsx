import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    theme={{
      tokens: {
        plot: {
          'plot.area.fill': {
            kind: 'image',
            href: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Football_pitch_metric_tr.svg',
          },
        },
        recipe: { axisEnabled: false },
      },
    }}
  >
    <ChartData data={messiWorldCupShots} />
    <ChartLayout width={800} height={500} />
    <ScatterEncodings x="x" y="y" color="outcome" />
    <ChartTitle>Lionel Messi 的 2022 世界杯射门空间分布</ChartTitle>
    <ChartSubtitle>32 次常规时间与加时赛射门；StatsBomb 120 × 80 坐标；圆点为起点，细线指向射门终点</ChartSubtitle>
    <ChartSource>StatsBomb Open Data：competition 43、season 106；排除 period 5 的 2 次点球大战事件</ChartSource>
    <ScatterProperties
      size={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]}
      {...(values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]
        ? { stroke: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke] }
        : {})}
      shape={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape]}
      opacity={values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]}
    />
  </ScatterChart>
));

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
