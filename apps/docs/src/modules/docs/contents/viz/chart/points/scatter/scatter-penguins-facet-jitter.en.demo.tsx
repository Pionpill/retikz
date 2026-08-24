import type { FC } from 'react';

import { ChartFacet, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterMark } from '@retikz/chart-react/point/scatter';
import { PlotAxis, PlotTransform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS } from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';
import { previewControlContract } from './scatter-penguins-facet-jitter.en.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ScatterChart
    data={penguinScatterData}
    encodings={{
      x: 'billLengthMm',
      y: 'flipperLengthMm',
      color: 'species',
    }}
    width={840}
    height={360}
  >
    <ChartTitle>Bill and flipper length across three penguin species</ChartTitle>
    <ChartSubtitle>Palmer Penguins; first 30 complete source-order records per species</ChartSubtitle>
    <ChartSource>Palmer Station Antarctica LTER; CC0; 342 of 344 rows have both measurements</ChartSource>
    <ChartFacet
      id="species"
      column={{ field: 'species', order: ['Adelie', 'Chinstrap', 'Gentoo'] }}
      header={{ column: true }}
      resolve={{ scale: { x: 'shared', y: 'shared' } }}
      spacing={{ panelGap: 20, labelGap: 52 }}
    />
    <PlotTransform
      kind="jitter"
      axis="x"
      xField="billLengthMm"
      amount={values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter]}
      seed={42}
    />
    <PlotAxis dimension="x" title="Bill length (mm)" grid />
    <PlotAxis dimension="y" title="Flipper length (mm)" grid />
    <ScatterMark
      override
      properties={{
        size: values[SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize],
        opacity: 0.72,
      }}
    />
  </ScatterChart>
));

/** Stable source configuration derived from canonical control values */
export const previewSource = controlledPreview.source;

/** Explicit fallback when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Faceting and deterministic jitter with Chart-owned and Plot-owned declarations */
const Demo: FC = controlledPreview.Component;

export default Demo;
