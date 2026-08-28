import type { FlexLayoutInspectOptions } from '@retikz/layout/inspect';
import type { FC } from 'react';

import { ChartData, ChartLayout, ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point/scatter';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { LayoutInspectLayout } from '@retikz/layout-react/inspect';
import { Layout } from '@retikz/react';

import { chartPresentationData } from './chart-presentation.data';

/** Presentation playground 的本地化整图文案 */
export type ChartPresentationPreviewCopy = Readonly<{
  title: string;
  subtitle: string;
  note: string;
  source: string;
}>;

const inspectOptions = {
  bounds: {
    container: true,
    content: true,
    slot: true,
    allocation: true,
    visual: false,
  },
  spacing: { padding: true, margin: false },
  overflow: true,
  alignmentGuides: false,
  labels: true,
  lines: true,
  gaps: true,
  distributedSpace: false,
} satisfies FlexLayoutInspectOptions;

const hostProps = {
  width: 440,
  height: 360,
  style: { maxWidth: '100%', height: 'auto' },
} as const;

const presentationViewBox = { x: -10, y: -10, width: 393.4, height: 345.2 } as const;

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
const chartOf = (copy: ChartPresentationPreviewCopy, visibility: ChartPresentationVisibility) => (
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

export type ChartPresentationLayoutPreviewProps = Readonly<{
  copy: ChartPresentationPreviewCopy;
  inspect: boolean;
}>;

/** 可开启内部 Flex Inspector 的 Presentation 预览 */
export const ChartPresentationLayoutPreview: FC<ChartPresentationLayoutPreviewProps> = props => {
  const { copy, inspect } = props;
  return inspect ? (
    <LayoutInspectLayout {...hostProps} request={{ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: inspectOptions }}>
      {chartOf(copy, visiblePresentation)}
    </LayoutInspectLayout>
  ) : (
    <Layout {...hostProps}>{chartOf(copy, visiblePresentation)}</Layout>
  );
};

export type ChartPresentationVisibilityPreviewProps = Readonly<{
  copy: ChartPresentationPreviewCopy;
  showTitle: boolean;
  showSubtitle: boolean;
  showNote: boolean;
  showSource: boolean;
}>;

/** 切换四个 presentation shorthand 是否存在的预览 */
export const ChartPresentationVisibilityPreview: FC<ChartPresentationVisibilityPreviewProps> = props => {
  const { copy, showTitle, showSubtitle, showNote, showSource } = props;
  const visibility = {
    title: showTitle,
    subtitle: showSubtitle,
    note: showNote,
    source: showSource,
  } satisfies ChartPresentationVisibility;
  return (
    <Layout {...hostProps} viewBox={presentationViewBox}>
      {chartOf(copy, visibility)}
    </Layout>
  );
};
