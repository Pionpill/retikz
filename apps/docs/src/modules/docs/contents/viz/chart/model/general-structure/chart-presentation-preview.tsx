import { ChartData, ChartLayout, ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';

import { chartPresentationData } from './chart-presentation.data';

/** Presentation playground 的本地化整图文案 */
export type ChartPresentationPreviewCopy = Readonly<{
  title: string;
  subtitle: string;
  note: string;
  source: string;
}>;

const sourceDimensions = { width: 580, height: 460 } as const;

/** 让整张 Chart 填满预览区，仅保留常规边距 */
const chartLayoutOf = (dimensions: PreviewDimensions) => ({
  width: Math.max(1, dimensions.width - 24),
  height: Math.max(1, dimensions.height - 24),
});

const hostPropsOf = (dimensions: PreviewDimensions) => ({
  width: dimensions.width,
  height: dimensions.height,
  style: { width: '100%', height: '100%' },
});

/** Presentation shorthand 的可见状态 */
export type ChartPresentationVisibility = Readonly<{
  title: boolean;
  subtitle: boolean;
  note: boolean;
  source: boolean;
}>;

const visiblePresentation = {
  title: true,
  subtitle: true,
  note: true,
  source: true,
} satisfies ChartPresentationVisibility;

/** 创建包含真实 Chart presentation 内容的 typed Point Chart authoring */
const chartOf = (
  copy: ChartPresentationPreviewCopy,
  visibility: ChartPresentationVisibility,
  dimensions: PreviewDimensions,
) => (
  <ScatterChart>
    <ChartData data={chartPresentationData} />
    <ChartLayout layout={chartLayoutOf(dimensions)} />
    <ScatterEncodings x="x" y="y" />
    <ScatterProperties size={8} />
    {visibility.title ? <ChartTitle>{copy.title}</ChartTitle> : null}
    {visibility.subtitle ? <ChartSubtitle>{copy.subtitle}</ChartSubtitle> : null}
    {visibility.note ? <ChartNote>{copy.note}</ChartNote> : null}
    {visibility.source ? <ChartSource>{copy.source}</ChartSource> : null}
  </ScatterChart>
);

export type ChartPresentationLayoutPreviewProps = Readonly<{
  copy: ChartPresentationPreviewCopy;
  visibility?: ChartPresentationVisibility;
  dimensions?: PreviewDimensions;
}>;

/** 普通 Presentation 布局预览 */
export const ChartPresentationLayoutPreview: FC<ChartPresentationLayoutPreviewProps> = props => {
  const { copy, visibility = visiblePresentation, dimensions = sourceDimensions } = props;
  return <Layout {...hostPropsOf(dimensions)}>{chartOf(copy, visibility, dimensions)}</Layout>;
};
