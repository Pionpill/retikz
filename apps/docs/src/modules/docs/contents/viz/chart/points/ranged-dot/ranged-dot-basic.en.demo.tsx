import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';
import { previewControlContract } from './ranged-dot-basic.en.controls';

const controlled = defineControlledPreview(previewControlContract, values => (
  <RangedDotChart
    coordinate={
      values[RANGED_DOT_CONTROL_IDS.coordinateSystem] === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }
    }
  >
    <ChartData data={rangedDotData} />
    <ChartLayout {...resolvePointPreviewLayout(values[RANGED_DOT_CONTROL_IDS.coordinateSystem])} />
    <RangedDotEncodings category="country" start="forestArea2000" end="forestArea2022" />
    <RangedDotProperties
      point={{ size: values[RANGED_DOT_CONTROL_IDS.pointSize] }}
      startPoint={{ color: values[RANGED_DOT_CONTROL_IDS.startColor], shape: 'circle' }}
      endPoint={{ color: values[RANGED_DOT_CONTROL_IDS.endColor], shape: 'circle' }}
      range={{
        stroke: values[RANGED_DOT_CONTROL_IDS.lineColor],
        strokeWidth: values[RANGED_DOT_CONTROL_IDS.strokeWidth],
        ...(values[RANGED_DOT_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
      }}
    />
    <ChartTitle>Change in forest cover across eighteen countries</ChartTitle>
    <ChartSubtitle>
      Forest area as a share of land; both endpoints are circles and default to the first two palette colors, sorted by
      the 2022 value
    </ChartSubtitle>
    <ChartSource>
      World Bank WDI indicator AG.LND.FRST.ZS; static snapshot accessed 2026-08-30 and rounded to one decimal
    </ChartSource>
  </RangedDotChart>
));

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
