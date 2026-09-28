import { ChartData } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS, previewControlContract } from './bubble-basic.controls';
import { gapminderBubbleData } from './bubble-basic.data';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <BubbleChart
      layout={dimensions ? { ...dimensions, padding: { top: 16, right: 48, bottom: 16, left: 16 } } : undefined}
      coordinate={
        values[BUBBLE_BASIC_CONTROL_IDS.coordinateSystem] === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }
      }
    >
      <ChartData data={gapminderBubbleData} />
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
      <BubbleProperties
        strokeWidth={values[BUBBLE_BASIC_CONTROL_IDS.pointStrokeWidth]}
        {...(values[BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]
          ? { stroke: values[BUBBLE_BASIC_CONTROL_IDS.pointStroke] }
          : {})}
        {...(values[BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity] === 0.7
          ? {}
          : { fillOpacity: values[BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity] })}
        shape={values[BUBBLE_BASIC_CONTROL_IDS.pointShape]}
      />
    </BubbleChart>
  );
  return chart;
});

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
