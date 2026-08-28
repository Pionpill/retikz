import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point/scatter';
import { PlotAxis } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS } from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';
import { previewControlContract } from './scatter-penguins-facet-jitter.en.controls';

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
    <ChartTitle>Bill and flipper length across three penguin species</ChartTitle>
    <ChartSubtitle>Palmer Penguins; first 30 complete source-order records per species</ChartSubtitle>
    <ChartSource>Palmer Station Antarctica LTER; CC0; 342 of 344 rows have both measurements</ChartSource>
    <ChartExtension>
      <PlotAxis dimension="x" title="Bill length (mm)" grid />
      <PlotAxis dimension="y" title="Flipper length (mm)" grid />
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

/** Stable source configuration derived from canonical control values */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'penguinScatterData', from: './scatter-penguins-facet-jitter.data' },
  },
};

/** Explicit fallback when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Faceting and jitter through rich encodings */
const Demo: FC = controlledPreview.Component;

export default Demo;
