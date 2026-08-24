import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={messiWorldCupShots}
    encodings={{ x: 'x', y: 'y', color: 'outcome' }}
    theme={{ tokens: { recipe: { axisEnabled: false, axisGridEnabled: false } } }}
    width={820}
    height={480}
  >
    <ChartTitle>Lionel Messi 的 2022 世界杯射门空间分布</ChartTitle>
    <ChartSubtitle>32 次常规时间与加时赛射门；StatsBomb 120 × 80 坐标；圆点为起点，细线指向射门终点</ChartSubtitle>
    <ChartSource>StatsBomb Open Data：competition 43、season 106；排除 period 5 的 2 次点球大战事件</ChartSource>
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize],
        stroke: '#f8fafc',
        strokeWidth: 1,
        opacity: values[SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity],
      }}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在 StatsBomb 空间坐标中展示射门起点与结果颜色 */
const Demo: FC = controlledPreview.Component;

export default Demo;
