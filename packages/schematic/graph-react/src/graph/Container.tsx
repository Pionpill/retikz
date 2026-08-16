import type {
  ContainerCreateOptions,
  ContainerRegionCreateOptions,
  ContainerSectionCreateOptions,
} from '@retikz/graph';
import type { InputContainer } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import { ContainerInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectSingleChild, hasAuthoringChildren } from './authoring';

/** Container 的 React 编写参数 */
export type ContainerProps = Omit<ContainerCreateOptions, 'header' | 'sections'> &
  Readonly<{
    /** 不使用 marker children 时直接提供的 canonical header input */
    header?: InputContainer['header'];
    /** 不使用 marker children 时直接提供的 canonical section inputs */
    sections?: InputContainer['sections'];
    /** 按 authored header/section 顺序排列的 marker children */
    children?: ReactNode;
  }>;

/** Container header marker 的 React 参数 */
export type ContainerHeaderProps = Readonly<{
  padding?: ContainerRegionCreateOptions['padding'];
  /** Header marker 的单个 React child */
  children: ReactNode;
}>;

/** Container section marker 的 React 参数 */
export type ContainerSectionProps = Readonly<{
  sectionKey: string;
  role?: string;
  padding?: ContainerSectionCreateOptions['padding'];
  /** Section marker 的单个 React child */
  children: ReactNode;
}>;

const readMarkerChildren = (
  children: ReactNode,
  embedIdPrefix: string,
  nextMarker: { value: number } = { value: 0 },
): Readonly<{ input: Pick<InputContainer, 'header' | 'sections'>; adapters: ReadonlyArray<AnyInputEmbedAdapter> }> => {
  let header: InputContainer['header'];
  const sections: Array<NonNullable<InputContainer['sections']>[number]> = [];
  const adapters: Array<AnyInputEmbedAdapter> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      const nested = readMarkerChildren((child.props as { children?: ReactNode }).children, embedIdPrefix, nextMarker);
      if (nested.input.header !== undefined) {
        if (header !== undefined) throw new Error('Container accepts at most one ContainerHeader.');
        header = nested.input.header;
      }
      sections.push(...(nested.input.sections ?? []));
      adapters.push(...nested.adapters);
      return;
    }
    if (isValidElement<ContainerHeaderProps>(child) && child.type === ContainerHeader) {
      if (header !== undefined) throw new Error('Container accepts at most one ContainerHeader.');
      const collected = collectSingleChild(
        child.props.children,
        'ContainerHeader',
        `${embedIdPrefix}:markers:${nextMarker.value++}`,
      );
      adapters.push(...collected.adapters);
      header = {
        ...(child.props.padding === undefined ? {} : { padding: child.props.padding }),
        child: collected.child,
      };
      return;
    }
    if (isValidElement<ContainerSectionProps>(child) && child.type === ContainerSection) {
      const props = child.props;
      const collected = collectSingleChild(
        props.children,
        `ContainerSection '${props.sectionKey}'`,
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
    throw new Error('Container accepts only ContainerHeader and ContainerSection direct children.');
  });
  return { input: { ...(header === undefined ? {} : { header }), sections }, adapters };
};

/** 将 Container marker children 组装为 Graph Vanilla Input */
const createContainerInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, header, sections, ...input } = props as ContainerProps;
  const hasMarkerChildren = hasAuthoringChildren(children);
  if (hasMarkerChildren && (header !== undefined || sections !== undefined)) {
    throw new Error('React Container cannot combine marker children with header or sections props.');
  }
  const markerInput = !hasMarkerChildren
    ? {
        input: { ...(header === undefined ? {} : { header }), ...(sections === undefined ? {} : { sections }) },
        adapters: [],
      }
    : readMarkerChildren(children, context.id);
  const inputProps: InputContainer = { ...input, ...markerInput.input };
  return withInputEmbedAdapters(inputProps, markerInput.adapters);
};

const ContainerComponent: FC<ContainerProps> = () => null;

/** 将 Container 接入 React 编写流程的组件 */
export const Container = ContainerComponent as GraphEmbeddableComponent<ContainerProps>;

Container.displayName = 'Container';
Container.isTier2Embeddable = true;
Container.inputEmbedAdapter = ContainerInputEmbedAdapter;
Container.createInputEmbedProps = createContainerInput;

/** 仅由直接的 Container 父节点消费的 header marker */
export const ContainerHeader: FC<ContainerHeaderProps> = () => {
  throw new Error('ContainerHeader must be used as a direct child of Container.');
};

ContainerHeader.displayName = 'ContainerHeader';

/** 仅由直接的 Container 父节点消费的 section marker */
export const ContainerSection: FC<ContainerSectionProps> = () => {
  throw new Error('ContainerSection must be used as a direct child of Container.');
};

ContainerSection.displayName = 'ContainerSection';
