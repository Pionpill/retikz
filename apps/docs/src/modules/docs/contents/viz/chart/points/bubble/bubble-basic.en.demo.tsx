import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { BubbleChart, BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point/bubble';
import { PlotAxis } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS } from './bubble-basic.controls';
import { gapminderBubbleData } from './bubble-basic.data';
import { previewControlContract } from './bubble-basic.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <BubbleChart>
    <ChartData data={gapminderBubbleData} />
    <ChartLayout width={800} height={500} />
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
    <ChartTitle>Income, life expectancy, and population</ChartTitle>
    <ChartSubtitle>142 countries and territories in 2007; bubble area is driven by population</ChartSubtitle>
    <ChartSource>Gapminder data package, 2007 cross-section; GDP per capita in PPP dollars</ChartSource>
    <ChartExtension>
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
      {...(values[BUBBLE_BASIC_CONTROL_IDS.pointFillEnabled]
        ? { fill: values[BUBBLE_BASIC_CONTROL_IDS.pointFill] }
        : {})}
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
