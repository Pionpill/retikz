import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point/ranged-dot';

import { defineControlledPreview } from '@/modules/docs/preview';

import { RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';
import { previewControlContract } from './ranged-dot-basic.en.controls';

const controlled = defineControlledPreview(previewControlContract, values => (
  <RangedDotChart>
    <ChartData data={rangedDotData} />
    <ChartLayout width={800} height={500} />
    <RangedDotEncodings category="country" start="forestArea2000" end="forestArea2022" />
    <RangedDotProperties
      point={{ size: values[RANGED_DOT_CONTROL_IDS.pointSize] }}
      startPoint={{ color: values[RANGED_DOT_CONTROL_IDS.startColor] }}
      endPoint={{ color: values[RANGED_DOT_CONTROL_IDS.endColor], shape: 'diamond' }}
      range={{
        stroke: '#94a3b8',
        strokeWidth: values[RANGED_DOT_CONTROL_IDS.strokeWidth],
        ...(values[RANGED_DOT_CONTROL_IDS.lineStyle] === 'dashed' ? { dashPattern: [8, 4] } : {}),
      }}
    />
    <ChartTitle>Change in forest cover across eighteen countries</ChartTitle>
    <ChartSubtitle>
      Forest area as a share of land; circles show 2000 and diamonds show 2022, sorted by the 2022 value
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
