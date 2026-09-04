import type { FC } from 'react';

import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RangedDotChart, RangedDotEncodings, RangedDotProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { previewControlContract, RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';

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
    <ChartTitle>十八个国家森林覆盖率的变化</ChartTitle>
    <ChartSubtitle>
      森林面积占国土比例；两个端点均为圆形，默认使用色系中的前两个颜色，按 2022 年数值升序排列
    </ChartSubtitle>
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
