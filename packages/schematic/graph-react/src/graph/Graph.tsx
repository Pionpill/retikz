import type { GraphDefinitionOptions } from '@retikz/graph';
import type { GraphInputEmbedProps, InputGraph } from '@retikz/graph-vanilla';
import { graphInputEmbedAdapter } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import { Layout, withInputEmbedAdapters } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { useId, useMemo } from 'react';

import { RetikzGraphReactError, RetikzGraphReactErrorCode } from '../errors';
import type { GraphEmbeddableComponent } from '../shared';
import { useGraphThemeDefinitions } from '../theme-context';
import type { GraphLayoutHostProps } from './authoring';
import { collectGraphChildren, graphLayoutHostPropKeys, graphLayoutHostPropsOf } from './authoring';

export type { GraphLayoutHostProps } from './authoring';

/** Graph Source root 的 React 编写参数 */
export type GraphProps = Omit<InputGraph, 'children'> &
  GraphDefinitionOptions &
  GraphLayoutHostProps &
  Readonly<{
    /** Graph 的任意 Kernel 或 Tier 2 semantic children */
    children?: ReactNode;
  }>;

type GraphInputCollection = Readonly<{
  input: GraphInputEmbedProps;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

/** 将 React children 与 props 组装为唯一 Graph Vanilla Input */
const collectGraphInput = (props: GraphProps, embedId: string, rejectHostProps: boolean): GraphInputCollection => {
  const unsupported = graphLayoutHostPropKeys.filter(key => Object.hasOwn(props, key));
  if (rejectHostProps && unsupported.length > 0) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.GraphHostPropsInvalid,
      message: `embedded Graph does not support standalone Layout props: ${unsupported.join(', ')}; move them to the outer <Layout>`,
      details: { label: 'Graph', reason: 'standalone-host-props-in-embedded-mode' },
    });
  }

  const {
    children,
    authoring: _authoring,
    compileDriver: _compileDriver,
    handlers: _handlers,
    runtime: _runtime,
    width: _width,
    height: _height,
    viewBox: _viewBox,
    className: _className,
    renderer: _renderer,
    animate: _animate,
    snapshotAt: _snapshotAt,
    animationRef: _animationRef,

    idPrefix: _idPrefix,
    nodeDistance: _nodeDistance,
    fontSize: _fontSize,
    shapes: _shapes,
    boundaries: _boundaries,
    clips: _clips,
    arrows: _arrows,
    patterns: _patterns,
    paths: _paths,
    composites: _composites,
    themeDefinitions: _themeDefinitions,
    lowerTex: _lowerTex,
    onArtifacts: _onArtifacts,
    onCompileResult: _onCompileResult,
    ...input
  } = props;
  void _authoring;
  void _compileDriver;
  void _handlers;
  void _runtime;
  void _width;
  void _height;
  void _viewBox;
  void _className;
  void _renderer;
  void _animate;
  void _snapshotAt;
  void _animationRef;

  void _idPrefix;
  void _nodeDistance;
  void _fontSize;
  void _shapes;
  void _boundaries;
  void _clips;
  void _arrows;
  void _patterns;
  void _paths;
  void _composites;
  void _themeDefinitions;
  void _lowerTex;
  void _onArtifacts;
  void _onCompileResult;

  const collected = collectGraphChildren(children, embedId);

  return {
    input: {
      ...input,
      ...(collected.children.length === 0 ? {} : { children: collected.children }),
    },
    adapters: collected.adapters,
  };
};

/** 将 public Graph props 转为外层 Layout 可消费的 embed props */
const createGraphInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const collected = collectGraphInput(props, context.id, true);
  return withInputEmbedAdapters(collected.input, collected.adapters);
};

type GraphRuntimeEmbedProps = Readonly<{
  input: GraphInputEmbedProps;
  adapters: ReadonlyArray<AnyInputEmbedAdapter>;
}>;

/** standalone Graph 内部复用的私有 Graph embed marker */
const GraphRuntimeEmbed = (() => null) as unknown as GraphEmbeddableComponent<GraphRuntimeEmbedProps>;

GraphRuntimeEmbed.displayName = 'GraphRuntimeEmbed';
GraphRuntimeEmbed.isTier2Embeddable = true;
GraphRuntimeEmbed.inputEmbedAdapter = graphInputEmbedAdapter;
GraphRuntimeEmbed.createInputEmbedProps = props => {
  const { input, adapters } = props as GraphRuntimeEmbedProps;
  return withInputEmbedAdapters(input, adapters);
};

const GraphComponent: FC<GraphProps> = props => {
  const generatedId = useId();
  const ambientGraphThemeDefinitions = useGraphThemeDefinitions();
  const collected = useMemo(() => {
    const result = collectGraphInput(props, props.id ?? generatedId, false);
    if (ambientGraphThemeDefinitions === undefined) return result;

    return {
      ...result,
      input: {
        ...result.input,
        graphThemeDefinitions:
          result.input.graphThemeDefinitions === undefined
            ? ambientGraphThemeDefinitions
            : [...ambientGraphThemeDefinitions, ...result.input.graphThemeDefinitions],
      },
    };
  }, [ambientGraphThemeDefinitions, generatedId, props]);
  const { shapes, boundaries, clips, arrows, patterns, paths, composites, themeDefinitions, ...hostProps } =
    graphLayoutHostPropsOf(props);

  return (
    <Layout
      {...hostProps}
      extensions={{
        shapes,
        boundaries,
        clips,
        arrows,
        patterns,
        paths,
        composites,
        themeDefinitions,
      }}
    >
      <GraphRuntimeEmbed input={collected.input} adapters={collected.adapters} />
    </Layout>
  );
};

/** 将 Graph Source root 接入 React 编写流程 */
export const Graph = GraphComponent as GraphEmbeddableComponent<GraphProps>;

Graph.displayName = 'Graph';
Graph.isTier2Embeddable = true;
Graph.inputEmbedAdapter = graphInputEmbedAdapter;
Graph.createInputEmbedProps = createGraphInput;
