import type { LogicFrameInput, LogicFrameRegionInput, LogicFrameSectionInput } from '@retikz/notation';
import type { InputLogicFrame } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { AnyInputEmbedAdapter } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import { LogicFrameInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';
import { Children, Fragment, isValidElement } from 'react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectSingleChild, hasAuthoringChildren } from './authoring';

/** LogicFrame 的 React 编写参数 */
export type LogicFrameProps = Omit<LogicFrameInput, 'header' | 'sections'> &
  Readonly<{
    /** 不使用 marker children 时直接提供的 canonical header input */
    header?: InputLogicFrame['header'];
    /** 不使用 marker children 时直接提供的 canonical section inputs */
    sections?: InputLogicFrame['sections'];
    /** 按 authored header/section 顺序排列的 marker children */
    children?: ReactNode;
  }>;

/** LogicFrame header marker 的 React 参数 */
export type LogicFrameHeaderProps = Readonly<{
  padding?: LogicFrameRegionInput['padding'];
  /** Header marker 的单个 React child */
  children: ReactNode;
}>;

/** LogicFrame section marker 的 React 参数 */
export type LogicFrameSectionProps = Readonly<{
  sectionKey: string;
  role?: string;
  padding?: LogicFrameSectionInput['padding'];
  /** Section marker 的单个 React child */
  children: ReactNode;
}>;

const readMarkerChildren = (
  children: ReactNode,
  embedIdPrefix: string,
  nextMarker: { value: number } = { value: 0 },
): Readonly<{ input: Pick<InputLogicFrame, 'header' | 'sections'>; adapters: ReadonlyArray<AnyInputEmbedAdapter> }> => {
  let header: InputLogicFrame['header'];
  const sections: Array<NonNullable<InputLogicFrame['sections']>[number]> = [];
  const adapters: Array<AnyInputEmbedAdapter> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      const nested = readMarkerChildren((child.props as { children?: ReactNode }).children, embedIdPrefix, nextMarker);
      if (nested.input.header !== undefined) {
        if (header !== undefined) throw new Error('LogicFrame accepts at most one LogicFrameHeader.');
        header = nested.input.header;
      }
      sections.push(...(nested.input.sections ?? []));
      adapters.push(...nested.adapters);
      return;
    }
    if (isValidElement<LogicFrameHeaderProps>(child) && child.type === LogicFrameHeader) {
      if (header !== undefined) throw new Error('LogicFrame accepts at most one LogicFrameHeader.');
      const collected = collectSingleChild(
        child.props.children,
        'LogicFrameHeader',
        `${embedIdPrefix}:markers:${nextMarker.value++}`,
      );
      adapters.push(...collected.adapters);
      header = {
        ...(child.props.padding === undefined ? {} : { padding: child.props.padding }),
        child: collected.child,
      };
      return;
    }
    if (isValidElement<LogicFrameSectionProps>(child) && child.type === LogicFrameSection) {
      const props = child.props;
      const collected = collectSingleChild(
        props.children,
        `LogicFrameSection '${props.sectionKey}'`,
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
    throw new Error('LogicFrame accepts only LogicFrameHeader and LogicFrameSection direct children.');
  });
  return { input: { ...(header === undefined ? {} : { header }), sections }, adapters };
};

/** 将 LogicFrame marker children 组装为 Notation Vanilla Input */
const createLogicFrameInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, header, sections, ...input } = props as LogicFrameProps;
  const hasMarkerChildren = hasAuthoringChildren(children);
  if (hasMarkerChildren && (header !== undefined || sections !== undefined)) {
    throw new Error('React LogicFrame cannot combine marker children with header or sections props.');
  }
  const markerInput = !hasMarkerChildren
    ? {
        input: { ...(header === undefined ? {} : { header }), ...(sections === undefined ? {} : { sections }) },
        adapters: [],
      }
    : readMarkerChildren(children, context.id);
  const inputProps: InputLogicFrame = { ...input, ...markerInput.input };
  return withInputEmbedAdapters(inputProps, markerInput.adapters);
};

const LogicFrameComponent: FC<LogicFrameProps> = () => null;

/** 将 Notation LogicFrame 接入 React 编写流程的组件 */
export const LogicFrame = LogicFrameComponent as NotationEmbeddableComponent<LogicFrameProps>;

LogicFrame.displayName = 'LogicFrame';
LogicFrame.isTier2Embeddable = true;
LogicFrame.inputEmbedAdapter = LogicFrameInputEmbedAdapter;
LogicFrame.createInputEmbedProps = createLogicFrameInput;

/** 仅由直接的 LogicFrame 父节点消费的 header marker */
export const LogicFrameHeader: FC<LogicFrameHeaderProps> = () => {
  throw new Error('LogicFrameHeader must be used as a direct child of LogicFrame.');
};

LogicFrameHeader.displayName = 'LogicFrameHeader';

/** 仅由直接的 LogicFrame 父节点消费的 section marker */
export const LogicFrameSection: FC<LogicFrameSectionProps> = () => {
  throw new Error('LogicFrameSection must be used as a direct child of LogicFrame.');
};

LogicFrameSection.displayName = 'LogicFrameSection';
