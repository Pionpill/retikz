import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';

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
    <ChartTitle>十八个国家森林覆盖率的变化</ChartTitle>
    <ChartSubtitle>森林面积占国土比例；圆点为 2000 年，菱形为 2022 年，按 2022 年数值升序排列</ChartSubtitle>
    <ChartSource>World Bank WDI 指标 AG.LND.FRST.ZS；2026-08-30 静态快照，数值保留一位小数</ChartSource>
  </RangedDotChart>
));

export const previewSource = {
  ...controlled.source,
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};
export const previewControls = previewControlContract.controls;
const Demo: FC = controlled.Component;
export default Demo;
