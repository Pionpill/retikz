import type { IRPlotSmoothMethod } from '@retikz/plot';
import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RegressionChart, RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { irisRegressionData } from './regression-basic.data';
import { previewControlContract } from './regression-basic.en.controls';
import { regressionTrendPropertiesOf } from './regression-basic-style';

type RegressionMethodKind = IRPlotSmoothMethod['kind'];

/** Maps control values to a complete Smooth method discriminator */
const methodOf = (kind: RegressionMethodKind, order: number): IRPlotSmoothMethod => {
  switch (kind) {
    case 'polynomial':
      return { kind, order };
    case 'linear':
    case 'quadratic':
    case 'logarithmic':
    case 'exponential':
    case 'power':
      return { kind };
  }
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <RegressionChart>
    <ChartData data={irisRegressionData} />
    <ChartLayout {...resolvePointPreviewLayout(values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem])} />
    <ChartExtension
      coordinate={
        values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem] === 'polar2D'
          ? { type: 'polar2D' }
          : { type: 'cartesian2D' }
      }
    />
    <RegressionEncodings
      x="sepalLengthCm"
      y="petalLengthCm"
      {...(values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies] ? { series: 'species' } : {})}
    />
    <RegressionProperties
      method={methodOf(values[REGRESSION_BASIC_CONTROL_IDS.method], values[REGRESSION_BASIC_CONTROL_IDS.order])}
      sampleCount={values[REGRESSION_BASIC_CONTROL_IDS.sampleCount]}
      point={{ opacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity] }}
      trend={regressionTrendPropertiesOf(
        values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
        values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
      )}
    />
    <ChartTitle>Regression trends between Iris sepal and petal length</ChartTitle>
    <ChartSubtitle>
      All 150 UCI Iris observations; sepal and petal lengths are in centimetres, with color encoding species
    </ChartSubtitle>
    <ChartSource>UCI Machine Learning Repository, DOI 10.24432/C56C76, CC BY 4.0; no rows filtered</ChartSource>
  </RegressionChart>
));

/** Stable source configuration derived from canonical control state */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' },
  },
};

/** Explicit fallback used when the controls registry is unavailable */
export const previewControls = previewControlContract.controls;

/** Basic Regression chart showing Iris observations and grouped trends */
const Demo: FC = controlledPreview.Component;

export default Demo;
