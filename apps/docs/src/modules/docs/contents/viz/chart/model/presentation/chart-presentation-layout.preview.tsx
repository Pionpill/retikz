import { ChartData, ChartLayout, ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';

import type { ChartPresentationPreviewCopy } from './chart-presentation-preview';
import { chartPresentationData } from './chart-presentation.data';

/** 展示标题、副标题、注记和来源参与整图布局的实际图形 */
export const renderChartPresentationLayout = (copy: ChartPresentationPreviewCopy) => (
  <ScatterChart>
    <ChartData data={chartPresentationData} />
    <ChartLayout layout={{ width: 320, height: 180 }} />
    <ScatterEncodings x="x" y="y" />
    <ScatterProperties size={8} />
    <ChartTitle>{copy.title}</ChartTitle>
    <ChartSubtitle>{copy.subtitle}</ChartSubtitle>
    <ChartNote>{copy.note}</ChartNote>
    <ChartSource>{copy.source}</ChartSource>
  </ScatterChart>
);
