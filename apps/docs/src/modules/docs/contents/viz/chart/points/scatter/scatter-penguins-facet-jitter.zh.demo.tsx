import type { FC } from 'react';

import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS,
} from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={penguinScatterData}
    dataModel={[
      { name: 'species', type: 'categorical' },
      { name: 'billLengthMm', type: 'continuous' },
      { name: 'flipperLengthMm', type: 'continuous' },
    ]}
    encodings={{
      x: 'billLengthMm',
      y: 'flipperLengthMm',
      color: 'species',
    }}
    plotExtension={{
      transform: [
        {
          kind: 'jitter',
          axis: 'x',
          xField: 'billLengthMm',
          amount: values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter],
          seed: 42,
        },
      ],
    }}
    width={840}
    height={360}
  >
    <ChartTitle>三种企鹅的喙长与鳍长</ChartTitle>
    <ChartSubtitle>Palmer Penguins；每个物种按源文件顺序取前 30 条完整记录</ChartSubtitle>
    <ChartSource>Palmer Station Antarctica LTER；CC0；原始 344 行，342 行的喙长与鳍长完整</ChartSource>
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize],
        opacity: 0.72,
      }}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 用 ScatterChart 与 ScatterMark 展示确定性抖动 */
const Demo: FC = controlledPreview.Component;

export default Demo;
