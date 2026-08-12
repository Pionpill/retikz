import type { LogicFrameInput, LogicFrameRegionInput, LogicFrameSectionInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createLogicFrame, LogicFrameProvider } from '@retikz/notation';
import { Children, Fragment, isValidElement } from 'react';

import type { NotationEmbeddableComponent } from '../shared';

import { convertSingleChild, hasAuthoringChildren } from './authoring';

/** LogicFrame 的 React 编写参数 */
export type LogicFrameProps = Omit<LogicFrameInput, 'header' | 'sections'> &
  Readonly<{
    /** 不使用 marker children 时直接提供的 canonical header input */
    header?: LogicFrameRegionInput;
    /** 不使用 marker children 时直接提供的 canonical section inputs */
    sections?: Array<LogicFrameSectionInput>;
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

const readMarkerChildren = (children: ReactNode): Pick<LogicFrameInput, 'header' | 'sections'> => {
  let header: LogicFrameRegionInput | undefined;
  const sections: Array<LogicFrameSectionInput> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      const nested = readMarkerChildren((child.props as { children?: ReactNode }).children);
      if (nested.header !== undefined) {
        if (header !== undefined) throw new Error('LogicFrame accepts at most one LogicFrameHeader.');
        header = nested.header;
      }
      sections.push(...(nested.sections ?? []));
      return;
    }
    if (isValidElement<LogicFrameHeaderProps>(child) && child.type === LogicFrameHeader) {
      if (header !== undefined) throw new Error('LogicFrame accepts at most one LogicFrameHeader.');
      header = {
        ...(child.props.padding === undefined ? {} : { padding: child.props.padding }),
        child: convertSingleChild(child.props.children, 'LogicFrameHeader'),
      };
      return;
    }
    if (isValidElement<LogicFrameSectionProps>(child) && child.type === LogicFrameSection) {
      const props = child.props;
      sections.push({
        key: props.sectionKey,
        ...(props.role === undefined ? {} : { role: props.role }),
        ...(props.padding === undefined ? {} : { padding: props.padding }),
        child: convertSingleChild(props.children, `LogicFrameSection '${props.sectionKey}'`),
      });
      return;
    }
    throw new Error('LogicFrame accepts only LogicFrameHeader and LogicFrameSection direct children.');
  });
  return { ...(header === undefined ? {} : { header }), sections };
};

const logicFrameEmbeddableAdapter: EmbeddableTier2Adapter<LogicFrameProps> = {
  displayName: 'LogicFrame',
  contribute: props => {
    const { children, header, sections, ...input } = props;
    const hasMarkerChildren = hasAuthoringChildren(children);
    if (hasMarkerChildren && (header !== undefined || sections !== undefined)) {
      throw new Error('React LogicFrame cannot combine marker children with header or sections props.');
    }
    const markerInput = !hasMarkerChildren
      ? { ...(header === undefined ? {} : { header }), ...(sections === undefined ? {} : { sections }) }
      : readMarkerChildren(children);
    return {
      node: createLogicFrame({ ...input, ...markerInput }),
      compositeDependencies: { roots: [LogicFrameProvider.key], providers: [LogicFrameProvider] },
    };
  },
};

const LogicFrameComponent: FC<LogicFrameProps> = () => null;

/** 将 Notation LogicFrame 接入 React 编写流程的组件 */
export const LogicFrame = LogicFrameComponent as NotationEmbeddableComponent<LogicFrameProps>;

LogicFrame.displayName = 'LogicFrame';
LogicFrame.isTier2Embeddable = true;
LogicFrame.embeddableAdapter = logicFrameEmbeddableAdapter;

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
