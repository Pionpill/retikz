import { ChartData } from '@retikz/chart-react';
import { StripChart, StripEncodings, StripProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, STRIP_BASIC_CONTROL_IDS } from './strip-basic.controls';
import { stripVegaBarleyData } from './strip-vega-barley.data';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <StripChart
      coordinate={
        values[STRIP_BASIC_CONTROL_IDS.coordinateSystem] === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }
      }
      layout={dimensions}
    >
      <ChartData data={stripVegaBarleyData} />
      <StripEncodings
        x={{ field: 'site', scale: { operation: { type: 'point', name: 'site' } } }}
        y={{ field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } }}
      />
      <StripProperties
        jitter={{
          span: { kind: 'ratio', value: values[STRIP_BASIC_CONTROL_IDS.jitterSpan] },
          distribution:
            values[STRIP_BASIC_CONTROL_IDS.distribution] === 'normal'
              ? { kind: 'normal', sigma: values[STRIP_BASIC_CONTROL_IDS.normalSigma] }
              : { kind: 'uniform' },
          seed: values[STRIP_BASIC_CONTROL_IDS.seed],
        }}
        size={values[STRIP_BASIC_CONTROL_IDS.pointSize]}
        opacity={values[STRIP_BASIC_CONTROL_IDS.pointOpacity]}
      />
    </StripChart>
  );
  return chart;
});

export const previewSource = {
  ...controlled.source,
  datasetImports: {
    'chart.data': { name: 'stripVegaBarleyData', from: './strip-vega-barley.data' },
  },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
