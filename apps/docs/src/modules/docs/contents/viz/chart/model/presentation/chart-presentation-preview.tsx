import { LayoutInspectLayout } from '@retikz/layout-react/inspect';
import type { FlexLayoutInspectOptions } from '@retikz/layout/inspect';
import { FLEX_LAYOUT_INSPECTOR_KEY } from '@retikz/layout/inspect';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { renderChartPresentationLayout } from './chart-presentation-layout.preview';
import { renderChartPresentationVisibility } from './chart-presentation-visibility.preview';

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

export type ChartPresentationLayoutPreviewProps = Readonly<{
  copy: ChartPresentationPreviewCopy;
  inspect: boolean;
}>;

/** 可开启内部 Flex Inspector 的 Presentation 预览 */
export const ChartPresentationLayoutPreview: FC<ChartPresentationLayoutPreviewProps> = props => {
  const { copy, inspect } = props;
  return inspect ? (
    <LayoutInspectLayout {...hostProps} request={{ inspector: FLEX_LAYOUT_INSPECTOR_KEY, options: inspectOptions }}>
      {renderChartPresentationLayout(copy)}
    </LayoutInspectLayout>
  ) : (
    <Layout {...hostProps}>{renderChartPresentationLayout(copy)}</Layout>
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
      {renderChartPresentationVisibility(copy, visibility)}
    </Layout>
  );
};
