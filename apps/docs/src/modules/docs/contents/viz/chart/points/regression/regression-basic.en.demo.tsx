import { ChartData } from '@retikz/chart-react';
import { RegressionChart, RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point';
import type { IRRegressionMethod } from '@retikz/data';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { regressionTrendPropertiesOf } from './regression-basic-style';
import { REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { irisRegressionData } from './regression-basic.data';
import { previewControlContract } from './regression-basic.en.controls';

type RegressionMethodKind = IRRegressionMethod['kind'];

/** Maps control values to a complete Smooth method discriminator */
const methodOf = (kind: RegressionMethodKind, order: number): IRRegressionMethod => {
  return kind === 'polynomial' ? { kind, order } : { kind };
};

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <RegressionChart layout={dimensions ? { ...dimensions, padding: { right: 48 } } : undefined}>
      <ChartData data={irisRegressionData} />
      <RegressionEncodings
        x="sepalLengthCm"
        y="petalLengthCm"
        {...(values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies] ? { series: 'species' } : {})}
      />
      <RegressionProperties
        point={{
          size: values[REGRESSION_BASIC_CONTROL_IDS.pointSize],
          opacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity],
        }}

        method={methodOf(values[REGRESSION_BASIC_CONTROL_IDS.method], values[REGRESSION_BASIC_CONTROL_IDS.order])}
        sampleCount={values[REGRESSION_BASIC_CONTROL_IDS.sampleCount]}

        trend={regressionTrendPropertiesOf(
          values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
          values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
        )}
      />
    </RegressionChart>
  );
  return chart;
});

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
