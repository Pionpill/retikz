import type { ChartLayoutProps } from '@retikz/chart-react';
import type { AssertEqual } from '@retikz/foundation';
import type { PlotLineageProps } from '@retikz/plot-react';
import type { LayoutProps } from '@retikz/react';
import type { ReactNode } from 'react';

import { ChartLayout } from '@retikz/chart-react';
import { ScatterChart } from '@retikz/chart-react/point/scatter';
import { Plot } from '@retikz/plot-react';
import { resolveInputEmbedAdapter } from '@retikz/react';
import { createElement, Fragment, isValidElement } from 'react';

type PlotStandaloneProps = Pick<LayoutProps, 'className' | 'style' | 'renderer' | 'themeStyles'> & PlotLineageProps;

const PLOT_STANDALONE_PROP_KEYS = [
  'className',
  'style',
  'renderer',
  'themeStyles',
  'lineage',
  'hostLineageMetadata',
  'onLineage',
] as const satisfies ReadonlyArray<keyof PlotStandaloneProps>;

type PlotStandalonePropKeysCheck = AssertEqual<(typeof PLOT_STANDALONE_PROP_KEYS)[number], keyof PlotStandaloneProps>;
const plotStandalonePropKeysCheck: PlotStandalonePropKeysCheck = true;
void plotStandalonePropKeysCheck;

const plotStandalonePropKeys = new Set<string>(PLOT_STANDALONE_PROP_KEYS);

type PreviewHostDimensions = Pick<LayoutProps, 'width' | 'height'>;

/** 移除预览 standalone 根已由宿主消费、不能再次交给 InputEmbed 的字段 */
const omitPreviewHostProps = (
  props: Readonly<Record<string, unknown>>,
  hostPropKeys: ReadonlySet<string>,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(props).filter(([key]) => !hostPropKeys.has(key)));

/** 从 ChartLayout declaration 提取预览 host 尺寸，并保留镜像后的 Source layout */
const preparePreviewChartProps = (
  props: Readonly<Record<string, unknown>>,
): Readonly<{ props: Readonly<Record<string, unknown>>; host: PreviewHostDimensions }> => {
  let host: PreviewHostDimensions = {};
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    if (value.type === Fragment) return createElement(Fragment, { key: value.key }, visit(value.props.children));
    if (value.type !== ChartLayout) return value;
    const layoutProps = value.props as ChartLayoutProps;
    host = {
      ...(layoutProps.width === undefined ? {} : { width: layoutProps.width }),
      ...(layoutProps.height === undefined ? {} : { height: layoutProps.height }),
    };
    const layout =
      layoutProps.layout ??
      (layoutProps.width === undefined && layoutProps.height === undefined
        ? undefined
        : {
            ...(layoutProps.width === undefined ? {} : { width: layoutProps.width }),
            ...(layoutProps.height === undefined ? {} : { height: layoutProps.height }),
          });
    return layout === undefined ? null : createElement(ChartLayout, { key: value.key, layout });
  };
  return { props: { ...props, children: visit(props.children as ReactNode) }, host };
};

/** 把 standalone 预览根投影为同一组件 InputEmbed 可消费的内容 props */
export const previewEmbedPropsOf = (
  component: unknown,
  props: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const adapter = resolveInputEmbedAdapter(component);
  if (adapter === Plot.inputEmbedAdapter) return omitPreviewHostProps(props, plotStandalonePropKeys);
  if (adapter === ScatterChart.inputEmbedAdapter) return preparePreviewChartProps(props).props;
  return props;
};

/** 读取预览根最终交给外层 Layout 的输出尺寸 */
export const previewHostDimensionsOf = (
  component: unknown,
  props: Readonly<Record<string, unknown>>,
): PreviewHostDimensions => {
  const adapter = resolveInputEmbedAdapter(component);
  if (adapter === ScatterChart.inputEmbedAdapter) return preparePreviewChartProps(props).host;
  return {
    ...(props.width === undefined ? {} : { width: props.width as LayoutProps['width'] }),
    ...(props.height === undefined ? {} : { height: props.height as LayoutProps['height'] }),
  };
};
