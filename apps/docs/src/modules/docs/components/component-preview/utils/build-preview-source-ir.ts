import type { IRChartSource } from '@retikz/chart';
import type { IRScatterChart } from '@retikz/chart/point/scatter';
import type { ScatterChartProps } from '@retikz/chart-react/point/scatter';
import type { IRChild, IRScene, IRScope } from '@retikz/core';
import type { InputFlowDiagram } from '@retikz/diagram-vanilla/flow';
import type { InputGraphChild, InputGraphMember } from '@retikz/graph-vanilla';
import type { AnyInputEmbed, InputChild, InputPath, InputScene, InputScope } from '@retikz/vanilla';
import type { ReactNode } from 'react';

import { CHART_NAMESPACE } from '@retikz/chart';
import { ScatterChart } from '@retikz/chart-react/point/scatter';
import { FlowDiagramEmbedKind, normalizeFlowDiagram } from '@retikz/diagram-vanilla/flow';
import {
  BlockEmbedKind,
  BlockHeaderEmbedKind,
  BlockRowEmbedKind,
  BlockSectionEmbedKind,
  EntityEmbedKind,
  GraphEmbedKind,
  GroupEmbedKind,
  normalizeBlock,
  normalizeBlockHeader,
  normalizeBlockRow,
  normalizeBlockSection,
  normalizeEntity,
  normalizeGraph,
  normalizeGroup,
  normalizeRelation,
  RelationEmbedKind,
} from '@retikz/graph-vanilla';
import { normalizeNode, normalizePath } from '@retikz/vanilla';
import { Fragment, isValidElement } from 'react';

import { previewEmbedPropsOf } from './preview-embed';

type TypedChartSource = IRScatterChart;

type TypedChartComponent<TSource extends TypedChartSource> = {
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => Readonly<{ source: TSource }>;
};

const sceneChildrenOf = (scene: InputScene): ReadonlyArray<InputChild> => {
  if ('children' in scene) return scene.children ?? [];
  return scene.layers
    .map((layer, index) => ({ layer, index }))
    .sort((left, right) => (left.layer.zIndex ?? 0) - (right.layer.zIndex ?? 0) || left.index - right.index)
    .flatMap(({ layer }) => layer.children);
};

const GRAPH_DEFINITION_OPTION_KEYS = new Set([
  'diagramThemeStyles',
  'flowThemeStyles',
  'flowLayouts',
  'defaultFlowLayout',
  'entityRoles',
  'entityKinds',
  'entityPredicates',
  'relationRoles',
  'relationKinds',
  'relationPredicates',
  'graphThemeStyles',
]);

const sourcePropsOf = (props: unknown): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(props as Readonly<Record<string, unknown>>).filter(
      ([key]) => !GRAPH_DEFINITION_OPTION_KEYS.has(key),
    ),
  );

const graphInputChildrenOf = (value: unknown): ReadonlyArray<InputGraphChild> | undefined => {
  if (typeof value !== 'object' || value === null || !('children' in value)) return undefined;
  const children = (value as Readonly<{ children?: unknown }>).children;
  return Array.isArray(children) ? (children as ReadonlyArray<InputGraphChild>) : undefined;
};

const graphChildrenOf = (value: IRChild | undefined): ReadonlyArray<IRChild> | undefined => {
  if (value === undefined || !('namespace' in value) || value.type === 'blockRow' || !('children' in value)) {
    return undefined;
  }
  return value.children as ReadonlyArray<IRChild>;
};

const runtimePropertyOf = (value: IRChild | undefined, key: string): IRChild | undefined => {
  if (value === undefined || !(key in value)) return undefined;
  return (value as Readonly<Record<string, unknown>>)[key] as IRChild | undefined;
};

const isInputGraphEmbed = (child: InputGraphChild): child is AnyInputEmbed =>
  !('namespace' in child) && child.type === 'embed';

const sourceCoreChildOf = (
  input: InputChild,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild => {
  if ('namespace' in input) return input;
  if (input.type === 'coordinate') return input;
  if (input.type === 'node' || 'position' in input) {
    return normalizeNode(input);
  }
  if (input.type === 'path' || input.type === undefined) return normalizePath(input as InputPath);
  if (input.type === 'scope') {
    const { type: _type, children, ...scopeWithAuthoring } = input as InputScope;
    void _type;
    const { authoring: _authoring, ...scope } = scopeWithAuthoring;
    void _authoring;
    const runtimeChildren = runtime?.type === 'scope' && Array.isArray(runtime.children) ? runtime.children : undefined;
    return {
      type: 'scope',
      ...scope,
      children: children.map((child, index) =>
        sourceChildOf(child, runtimeChildren?.[index], chartSources, chartIndex),
      ),
    } as IRScope;
  }
  return runtime ?? (input as IRChild);
};

const sourceGraphChildrenOf = (
  children: ReadonlyArray<InputGraphChild> | undefined,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): ReadonlyArray<IRChild> | undefined => {
  if (children === undefined) return undefined;
  const runtimeChildren = graphChildrenOf(runtime);
  return children.map((child, index) => sourceGraphChildOf(child, runtimeChildren?.[index], chartSources, chartIndex));
};

const sourceGraphMemberOf = (
  input: InputGraphMember,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild => {
  switch (input.type) {
    case 'graph': {
      const children = sourceGraphChildrenOf(input.children, runtime, chartSources, chartIndex);
      return normalizeGraph({ ...input, ...(children === undefined ? {} : { children }) });
    }
    case 'group': {
      const children = sourceGraphChildrenOf(input.children, runtime, chartSources, chartIndex);
      return normalizeGroup({ ...input, ...(children === undefined ? {} : { children }) });
    }
    case 'block': {
      const children = sourceGraphChildrenOf(input.children, runtime, chartSources, chartIndex);
      return normalizeBlock({ ...input, ...(children === undefined ? {} : { children }) });
    }
    case 'blockHeader':
      return normalizeBlockHeader({
        ...input,
        ...(input.icon === undefined
          ? {}
          : { icon: sourceGraphChildOf(input.icon, runtimePropertyOf(runtime, 'icon'), chartSources, chartIndex) }),
        ...(input.trail === undefined
          ? {}
          : {
              trail: sourceGraphChildOf(input.trail, runtimePropertyOf(runtime, 'trail'), chartSources, chartIndex),
            }),
      });
    case 'blockSection': {
      const children = sourceGraphChildrenOf(input.children, runtime, chartSources, chartIndex);
      return normalizeBlockSection({ ...input, ...(children === undefined ? {} : { children }) });
    }
    case 'blockRow': {
      if (input.content !== undefined) return normalizeBlockRow(input);
      const runtimeItems =
        runtime !== undefined &&
        'namespace' in runtime &&
        runtime.type === 'blockRow' &&
        Array.isArray(runtime.children)
          ? runtime.children
          : undefined;
      return normalizeBlockRow({
        ...input,
        ...(input.children === undefined
          ? {}
          : {
              children: input.children.map((item, index) =>
                sourceGraphChildOf(item, runtimeItems?.[index], chartSources, chartIndex),
              ),
            }),
      });
    }
    case 'entity':
      return normalizeEntity(input);
    case 'relation':
      return normalizeRelation(input);
  }
};

const sourceGraphEmbedOf = (
  input: AnyInputEmbed,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild | undefined => {
  const props = sourcePropsOf(input.props);
  switch (input.kind) {
    case FlowDiagramEmbedKind:
      return normalizeFlowDiagram(props as InputFlowDiagram);
    case GraphEmbedKind:
      return sourceGraphMemberOf(
        { ...props, type: 'graph', children: graphInputChildrenOf(props) },
        runtime,
        chartSources,
        chartIndex,
      );
    case GroupEmbedKind:
      return sourceGraphMemberOf(
        { ...props, type: 'group', children: graphInputChildrenOf(props) },
        runtime,
        chartSources,
        chartIndex,
      );
    case BlockEmbedKind:
      return sourceGraphMemberOf(
        { ...props, type: 'block', children: graphInputChildrenOf(props) },
        runtime,
        chartSources,
        chartIndex,
      );
    case BlockHeaderEmbedKind:
      return sourceGraphMemberOf(
        { ...props, type: 'blockHeader' } as InputGraphMember,
        runtime,
        chartSources,
        chartIndex,
      );
    case BlockSectionEmbedKind:
      return sourceGraphMemberOf(
        { ...props, type: 'blockSection', children: graphInputChildrenOf(props) },
        runtime,
        chartSources,
        chartIndex,
      );
    case BlockRowEmbedKind:
      return sourceGraphMemberOf({ ...props, type: 'blockRow' }, runtime, chartSources, chartIndex);
    case EntityEmbedKind:
      return sourceGraphMemberOf({ ...props, type: 'entity' } as InputGraphMember, runtime, chartSources, chartIndex);
    case RelationEmbedKind:
      return sourceGraphMemberOf({ ...props, type: 'relation' } as InputGraphMember, runtime, chartSources, chartIndex);
    default:
      return undefined;
  }
};

const sourceGraphChildOf = (
  input: InputGraphChild,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild => {
  if (isInputGraphEmbed(input)) {
    if (input.kind === CHART_NAMESPACE) {
      const source = chartSources.at(chartIndex.value);
      chartIndex.value += 1;
      return source ?? runtime ?? (input as unknown as IRChild);
    }
    return sourceGraphEmbedOf(input, runtime, chartSources, chartIndex) ?? runtime ?? (input as unknown as IRChild);
  }
  if ('namespace' in input) return input;
  if (
    input.type === 'graph' ||
    input.type === 'group' ||
    input.type === 'block' ||
    input.type === 'blockHeader' ||
    input.type === 'blockSection' ||
    input.type === 'blockRow' ||
    input.type === 'entity' ||
    input.type === 'relation'
  ) {
    return sourceGraphMemberOf(input, runtime, chartSources, chartIndex);
  }
  return sourceCoreChildOf(input, runtime, chartSources, chartIndex);
};

const sourceChildOf = (
  input: InputChild,
  runtime: IRChild | undefined,
  chartSources: ReadonlyArray<TypedChartSource>,
  chartIndex: { value: number },
): IRChild => sourceGraphChildOf(input, runtime, chartSources, chartIndex);

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
