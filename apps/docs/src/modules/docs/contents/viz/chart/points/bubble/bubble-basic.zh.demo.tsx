import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';
import { PlotAxis } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { BUBBLE_BASIC_CONTROL_IDS, previewControlContract } from './bubble-basic.controls';
import { gapminderBubbleData } from './bubble-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <BubbleChart>
    <ChartData data={gapminderBubbleData} />
    <ChartLayout {...resolvePointPreviewLayout(values[BUBBLE_BASIC_CONTROL_IDS.coordinateSystem])} />
    <BubbleEncodings
      x={
        values[BUBBLE_BASIC_CONTROL_IDS.xScale] === 'log'
          ? { field: 'gdpPerCapita', scale: { operation: { type: 'log', name: 'gdpPerCapitaScale' } } }
          : 'gdpPerCapita'
      }
      y="lifeExpectancy"
      size="population"
      {...(values[BUBBLE_BASIC_CONTROL_IDS.colorByContinent] ? { color: 'continent' } : {})}
    />
    <ChartTitle>收入、寿命与人口规模</ChartTitle>
    <ChartSubtitle>142 个国家和地区，2007 年；气泡面积由人口字段驱动</ChartSubtitle>
    <ChartSource>Gapminder 数据包 2007 年截面；人均 GDP 按购买力平价美元计</ChartSource>
    <ChartExtension
      coordinate={
        values[BUBBLE_BASIC_CONTROL_IDS.coordinateSystem] === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }
      }
    >
      <PlotAxis
        dimension="x"
        ticks={{
          count: values[BUBBLE_BASIC_CONTROL_IDS.xTickCount],
          ...(values[BUBBLE_BASIC_CONTROL_IDS.xTickMarks] ? {} : { line: false }),
        }}
        tickLabels={values[BUBBLE_BASIC_CONTROL_IDS.xTickLabels] ? undefined : false}
        grid={values[BUBBLE_BASIC_CONTROL_IDS.xGrid]}
      />
      <PlotAxis dimension="y" grid />
    </ChartExtension>
    <BubbleProperties
      {...(values[BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]
        ? { stroke: values[BUBBLE_BASIC_CONTROL_IDS.pointStroke] }
        : {})}
      {...(values[BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity] === 0.7
        ? {}
        : { fillOpacity: values[BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity] })}
      shape={values[BUBBLE_BASIC_CONTROL_IDS.pointShape]}
    />
  </BubbleChart>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示收入、寿命与人口规模关系的基础气泡图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
