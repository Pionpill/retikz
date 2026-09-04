import type { IRChartSource } from '@retikz/chart';
import type { IRBubbleChart } from '@retikz/chart/point/bubble';
import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';
import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import type { IRRegressionChart } from '@retikz/chart/point/regression';
import type { IRScatterChart } from '@retikz/chart/point/scatter';
import type { IRStripChart } from '@retikz/chart/point/strip';
import type {
  BubbleChartProps,
  ConnectedScatterChartProps,
  RangedDotChartProps,
  RegressionChartProps,
  ScatterChartProps,
  StripChartProps,
} from '@retikz/chart-react/point';
import type { IRChild, IRScene, IRScope } from '@retikz/core';
import type { AnyInputEmbed, InputChild, InputScene } from '@retikz/vanilla';
import type { ReactNode } from 'react';

import { CHART_NAMESPACE } from '@retikz/chart';
import {
  BubbleChart,
  ConnectedScatterChart,
  RangedDotChart,
  RegressionChart,
  ScatterChart,
  StripChart,
} from '@retikz/chart-react/point';
import { Fragment, isValidElement } from 'react';

import { previewEmbedPropsOf } from './preview-embed';

type TypedChartSource =
  | IRScatterChart
  | IRBubbleChart
  | IRConnectedScatterChart
  | IRRangedDotChart
  | IRRegressionChart
  | IRStripChart;

type TypedChartComponent<TSource extends TypedChartSource> = {
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => Readonly<{ source: TSource }>;
};

const isInputEmbed = (child: InputChild): child is AnyInputEmbed => child.type === 'embed';

const isCoreScope = (child: IRChild): child is IRScope => child.type === 'scope' && !('namespace' in child);

const inputChildrenOf = (child: InputChild): ReadonlyArray<InputChild> | undefined =>
  'children' in child ? (child as Readonly<{ children?: ReadonlyArray<InputChild> }>).children : undefined;

const sceneChildrenOf = (scene: InputScene): ReadonlyArray<InputChild> => {
  if ('children' in scene) return scene.children ?? [];
  return scene.layers
    .map((layer, index) => ({ layer, index }))
    .sort((left, right) => (left.layer.zIndex ?? 0) - (right.layer.zIndex ?? 0) || left.index - right.index)
    .flatMap(({ layer }) => layer.children);
};

/** 从 typed Chart React component 的同一 Vanilla bridge 读取精简 Source IR */
const typedChartSourceOf = <TProps, TSource extends TypedChartSource>(
  component: TypedChartComponent<TSource>,
  props: TProps,
): TSource =>
  component.createInputEmbedProps(previewEmbedPropsOf(component, props as Readonly<Record<string, unknown>>)).source;

const sourceOf = (value: ReactNode): TypedChartSource | undefined => {
  if (!isValidElement(value)) return undefined;
  if (value.type === ScatterChart) {
    return typedChartSourceOf(ScatterChart, value.props as ScatterChartProps);
  }
  if (value.type === BubbleChart) {
    return typedChartSourceOf(BubbleChart, value.props as BubbleChartProps);
  }
  if (value.type === ConnectedScatterChart) {
    return typedChartSourceOf(ConnectedScatterChart, value.props as ConnectedScatterChartProps);
  }
  if (value.type === RangedDotChart) {
    return typedChartSourceOf(RangedDotChart, value.props as RangedDotChartProps);
  }
  if (value.type === RegressionChart) {
    return typedChartSourceOf(RegressionChart, value.props as RegressionChartProps);
  }
  if (value.type === StripChart) {
    return typedChartSourceOf(StripChart, value.props as StripChartProps);
  }
  return undefined;
};

/** 从 docs 执行的 React authoring tree 收集精确 typed Chart Source IR */
export const collectPreviewChartSources = (node: ReactNode): Array<TypedChartSource> => {
  const sources: Array<TypedChartSource> = [];
  const visit = (value: ReactNode): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const source = sourceOf(value);
    if (source !== undefined) {
      sources.push(source);
      return;
    }
    if (!isValidElement(value)) return;
    if (value.type === Fragment) {
      visit(value.props.children as ReactNode);
      return;
    }
    visit(value.props.children as ReactNode);
  };
  visit(node);
  return sources;
};

const sourceChildOf = (
  input: InputChild,
  runtime: IRChild,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild => {
  if (isInputEmbed(input)) {
    if (input.kind !== CHART_NAMESPACE) return runtime;
    const source = chartSources.at(chartIndex.value);
    chartIndex.value += 1;
    return source ?? runtime;
  }
  const inputChildren = inputChildrenOf(input);
  if (inputChildren === undefined || !isCoreScope(runtime) || inputChildren.length !== runtime.children.length) {
    return runtime;
  }
  return {
    ...runtime,
    children: runtime.children.map((child, index) =>
      sourceChildOf(inputChildren[index], child, chartSources, chartIndex),
    ),
  };
};

/** 从文档预览的作者输入派生高层 Source IR，运行时包无需携带展示 sidecar */
export const buildPreviewSourceIR = (
  input: InputScene,
  runtime: IRScene,
  chartSources: ReadonlyArray<TypedChartSource>,
): IRScene => {
  const inputChildren = sceneChildrenOf(input);
  if (inputChildren.length !== runtime.children.length) return runtime;
  const chartIndex = { value: 0 };
  return {
    ...runtime,
    children: runtime.children.map((child, index) =>
      sourceChildOf(inputChildren[index], child, chartSources, chartIndex),
    ),
  };
};

/** Narrow chart source guard for callers that need to inspect the Source IR union */
export const isPreviewChartSource = (value: IRChild): value is TypedChartSource =>
  'namespace' in value && value.namespace === CHART_NAMESPACE && value.type === 'point';

export type PreviewChartSource = IRChartSource;
