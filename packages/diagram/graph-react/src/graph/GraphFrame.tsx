import type { GraphFrameCreateOptions, GraphFrameRegionCreateOptions, GraphFrameSectionCreateOptions } from '@retikz/graph';
import type { InputGraphFrame } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import { GraphFrameInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectSingleChild, hasAuthoringChildren } from './authoring';

/** GraphFrame 的 React 编写参数 */
export type GraphFrameProps = Omit<GraphFrameCreateOptions, 'header' | 'sections'> &
  Readonly<{
    /** 不使用 marker children 时直接提供的 canonical header input */
    header?: InputGraphFrame['header'];
    /** 不使用 marker children 时直接提供的 canonical section inputs */
    sections?: InputGraphFrame['sections'];
    /** 按 authored header/section 顺序排列的 marker children */
    children?: ReactNode;
  }>;

/** GraphFrame header marker 的 React 参数 */
export type GraphFrameHeaderProps = Readonly<{
  padding?: GraphFrameRegionCreateOptions['padding'];
  /** Header marker 的单个 React child */
  children: ReactNode;
}>;

/** GraphFrame section marker 的 React 参数 */
export type GraphFrameSectionProps = Readonly<{
  sectionKey: string;
  role?: string;
  padding?: GraphFrameSectionCreateOptions['padding'];
  /** Section marker 的单个 React child */
  children: ReactNode;
}>;

const readMarkerChildren = (
  children: ReactNode,
  embedIdPrefix: string,
  nextMarker: { value: number } = { value: 0 },
): Readonly<{ input: Pick<InputGraphFrame, 'header' | 'sections'>; adapters: ReadonlyArray<AnyInputEmbedAdapter> }> => {
  let header: InputGraphFrame['header'];
  const sections: Array<NonNullable<InputGraphFrame['sections']>[number]> = [];
  const adapters: Array<AnyInputEmbedAdapter> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      const nested = readMarkerChildren((child.props as { children?: ReactNode }).children, embedIdPrefix, nextMarker);
      if (nested.input.header !== undefined) {
        if (header !== undefined) throw new Error('GraphFrame accepts at most one GraphFrameHeader.');
        header = nested.input.header;
      }
      sections.push(...(nested.input.sections ?? []));
      adapters.push(...nested.adapters);
      return;
    }
    if (isValidElement<GraphFrameHeaderProps>(child) && child.type === GraphFrameHeader) {
      if (header !== undefined) throw new Error('GraphFrame accepts at most one GraphFrameHeader.');
      const collected = collectSingleChild(
        child.props.children,
        'GraphFrameHeader',
        `${embedIdPrefix}:markers:${nextMarker.value++}`,
      );
      adapters.push(...collected.adapters);
      header = {
        ...(child.props.padding === undefined ? {} : { padding: child.props.padding }),
        child: collected.child,
      };
      return;
    }
    if (isValidElement<GraphFrameSectionProps>(child) && child.type === GraphFrameSection) {
      const props = child.props;
      const collected = collectSingleChild(
        props.children,
        `GraphFrameSection '${props.sectionKey}'`,
        `${embedIdPrefix}:markers:${nextMarker.value++}`,
      );
      adapters.push(...collected.adapters);
      sections.push({
        key: props.sectionKey,
        ...(props.role === undefined ? {} : { role: props.role }),
        ...(props.padding === undefined ? {} : { padding: props.padding }),
        child: collected.child,
      });
      return;
    }
    throw new Error('GraphFrame accepts only GraphFrameHeader and GraphFrameSection direct children.');
  });
  return { input: { ...(header === undefined ? {} : { header }), sections }, adapters };
};

/** 将 GraphFrame marker children 组装为 Graph Vanilla Input */
const createGraphFrameInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, header, sections, ...input } = props as GraphFrameProps;
  const hasMarkerChildren = hasAuthoringChildren(children);
  if (hasMarkerChildren && (header !== undefined || sections !== undefined)) {
    throw new Error('React GraphFrame cannot combine marker children with header or sections props.');
  }
  const markerInput = !hasMarkerChildren
    ? {
        input: { ...(header === undefined ? {} : { header }), ...(sections === undefined ? {} : { sections }) },
        adapters: [],
      }
    : readMarkerChildren(children, context.id);
  const inputProps: InputGraphFrame = { ...input, ...markerInput.input };
  return withInputEmbedAdapters(inputProps, markerInput.adapters);
};

const GraphFrameComponent: FC<GraphFrameProps> = () => null;

/** 将 GraphFrame 接入 React 编写流程的组件 */
export const GraphFrame = GraphFrameComponent as GraphEmbeddableComponent<GraphFrameProps>;

GraphFrame.displayName = 'GraphFrame';
GraphFrame.isTier2Embeddable = true;
GraphFrame.inputEmbedAdapter = GraphFrameInputEmbedAdapter;
GraphFrame.createInputEmbedProps = createGraphFrameInput;

/** 仅由直接的 GraphFrame 父节点消费的 header marker */
export const GraphFrameHeader: FC<GraphFrameHeaderProps> = () => {
  throw new Error('GraphFrameHeader must be used as a direct child of GraphFrame.');
};

GraphFrameHeader.displayName = 'GraphFrameHeader';

/** 仅由直接的 GraphFrame 父节点消费的 section marker */
export const GraphFrameSection: FC<GraphFrameSectionProps> = () => {
  throw new Error('GraphFrameSection must be used as a direct child of GraphFrame.');
};

GraphFrameSection.displayName = 'GraphFrameSection';
