import { ChartData } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS } from './bubble-basic.controls';
import { gapminderBubbleData } from './bubble-basic.data';
import { previewControlContract } from './bubble-basic.en.controls';

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

/** Stable source configuration derived from canonical control state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' },
  },
};

/** Explicit fallback used when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Basic bubble chart comparing income, life expectancy, and population */
const Demo: FC = controlledPreview.Component;

export default Demo;
