import { ChartData, ChartLayout, ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import type { ChartPresentationPreviewCopy, ChartPresentationVisibility } from './chart-presentation-preview';
import { chartPresentationData } from './chart-presentation.data';

/** 根据展示项的开关创建真实 Chart presentation */
export const renderChartPresentationVisibility = (
  copy: ChartPresentationPreviewCopy,
  visibility: ChartPresentationVisibility,
) => (
  <ScatterChart>
    <ChartData data={chartPresentationData} />
    <ChartLayout layout={{ width: 320, height: 180 }} />
    <ScatterEncodings x="x" y="y" />
    <ScatterProperties size={8} />
    {visibility.title ? <ChartTitle>{copy.title}</ChartTitle> : null}
    {visibility.subtitle ? <ChartSubtitle>{copy.subtitle}</ChartSubtitle> : null}
    {visibility.note ? <ChartNote>{copy.note}</ChartNote> : null}
    {visibility.source ? <ChartSource>{copy.source}</ChartSource> : null}
  </ScatterChart>
);
