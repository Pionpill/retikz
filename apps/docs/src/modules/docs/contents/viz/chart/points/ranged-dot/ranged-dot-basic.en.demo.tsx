import { ChartData } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';
import { previewControlContract } from './ranged-dot-basic.en.controls';

const controlled = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <RangedDotChart
      coordinate={
        values[RANGED_DOT_CONTROL_IDS.coordinateSystem] === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }
      }
      layout={dimensions}
    >
      <ChartData data={rangedDotData} />
      <RangedDotEncodings category="country" start="forestArea2000" end="forestArea2022" />
      <RangedDotProperties
        point={{
          shape: values[RANGED_DOT_CONTROL_IDS.pointShape],
          opacity: values[RANGED_DOT_CONTROL_IDS.pointOpacity],
          size: values[RANGED_DOT_CONTROL_IDS.pointSize],
        }}
        startPoint={{
          ...(values[RANGED_DOT_CONTROL_IDS.customEndpoints] ? { size: values[RANGED_DOT_CONTROL_IDS.startSize] } : {}),
          color: values[RANGED_DOT_CONTROL_IDS.startColor],
        }}
        endPoint={{
          ...(values[RANGED_DOT_CONTROL_IDS.customEndpoints] ? { size: values[RANGED_DOT_CONTROL_IDS.endSize] } : {}),
          ...(values[RANGED_DOT_CONTROL_IDS.customEndpoints] ? { shape: values[RANGED_DOT_CONTROL_IDS.endShape] } : {}),
          color: values[RANGED_DOT_CONTROL_IDS.endColor],
        }}
        range={{
          stroke: values[RANGED_DOT_CONTROL_IDS.lineColor],
          strokeWidth: values[RANGED_DOT_CONTROL_IDS.strokeWidth],
          ...(values[RANGED_DOT_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
        }}
      />
    </RangedDotChart>
  );
  return chart;
});

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
