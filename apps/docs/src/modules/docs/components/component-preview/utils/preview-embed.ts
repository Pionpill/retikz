import type { ChartHostProps } from '@retikz/chart-react';
import type { AssertEqual } from '@retikz/foundation';
import type { PlotLineageProps } from '@retikz/plot-react';
import type { LayoutProps } from '@retikz/react';

import { ScatterChart } from '@retikz/chart-react/point/scatter';
import { Plot } from '@retikz/plot-react';
import { resolveInputEmbedAdapter } from '@retikz/react';

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

const CHART_HOST_PROP_KEYS = [
  'width',
  'height',
  'className',
  'style',
  'renderer',
  'themeStyles',
  'runtime',
  'animate',
  'snapshotAt',
  'animationRef',
  'onArtifacts',
  'onCompileResult',
] as const satisfies ReadonlyArray<keyof ChartHostProps>;

type PlotStandalonePropKeysCheck = AssertEqual<(typeof PLOT_STANDALONE_PROP_KEYS)[number], keyof PlotStandaloneProps>;
type ChartHostPropKeysCheck = AssertEqual<(typeof CHART_HOST_PROP_KEYS)[number], keyof ChartHostProps>;
const plotStandalonePropKeysCheck: PlotStandalonePropKeysCheck = true;
const chartHostPropKeysCheck: ChartHostPropKeysCheck = true;
void plotStandalonePropKeysCheck;
void chartHostPropKeysCheck;

const plotStandalonePropKeys = new Set<string>(PLOT_STANDALONE_PROP_KEYS);
const chartHostPropKeys = new Set<string>(CHART_HOST_PROP_KEYS);

/** 移除预览 standalone 根已由宿主消费、不能再次交给 InputEmbed 的字段 */
const omitPreviewHostProps = (
  props: Readonly<Record<string, unknown>>,
  hostPropKeys: ReadonlySet<string>,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(Object.entries(props).filter(([key]) => !hostPropKeys.has(key)));

/** 把 standalone 预览根投影为同一组件 InputEmbed 可消费的内容 props */
export const previewEmbedPropsOf = (
  component: unknown,
  props: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const adapter = resolveInputEmbedAdapter(component);
  if (adapter === Plot.inputEmbedAdapter) return omitPreviewHostProps(props, plotStandalonePropKeys);
  if (adapter === ScatterChart.inputEmbedAdapter) return omitPreviewHostProps(props, chartHostPropKeys);
  return props;
};
