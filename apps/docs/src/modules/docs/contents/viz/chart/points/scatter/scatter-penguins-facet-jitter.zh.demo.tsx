import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point/scatter';
import { PlotAxis } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  previewControlContract,
  SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS,
} from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart>
    <ChartData data={penguinScatterData} />
    <ChartLayout width={800} height={500} />
    <ScatterEncodings
      x={{
        transform: {
          kind: 'jitter',
          xField: 'billLengthMm',
        },
        output: 'billLengthMm',
      }}
      y="flipperLengthMm"
      column="species"
      facet={{
        header: { column: true },
        spacing: { panelGap: 20, labelGap: 52 },
      }}
    />
    <ChartTitle>三种企鹅的喙长与鳍长</ChartTitle>
    <ChartSubtitle>Palmer Penguins；每个物种按源文件顺序取前 30 条完整记录</ChartSubtitle>
    <ChartSource>Palmer Station Antarctica LTER；CC0；原始 344 行，342 行的喙长与鳍长完整</ChartSource>
    <ChartExtension>
      <PlotAxis dimension="x" title="喙长（mm）" grid />
      <PlotAxis dimension="y" title="鳍长（mm）" grid />
    </ChartExtension>
    <ScatterProperties
      size={values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize]}
      {...(values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFillEnabled]
        ? { fill: values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFill] }
        : {})}
      {...(values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStrokeEnabled]
        ? { stroke: values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStroke] }
        : {})}
      shape={values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointShape]}
      opacity={values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointOpacity]}
    />
  </ScatterChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'penguinScatterData', from: './scatter-penguins-facet-jitter.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 用 rich encodings 展示分面和抖动 */
const Demo: FC = controlledPreview.Component;

export default Demo;
