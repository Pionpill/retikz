import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { LogicBlockBaseInput, LogicBlockRegionInput, LogicBlockSectionInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createLogicBlockBase, LogicBlockBaseDefinition } from '@retikz/standard';
import { Children, Fragment, isValidElement } from 'react';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardLogicBlockBaseReactNamespace } from '../shared';
import { convertSingleChild, hasAuthoringChildren } from './authoring';

/** LogicBlockBase 的 React 编写参数 */
export type LogicBlockBaseProps = Omit<LogicBlockBaseInput, 'header' | 'sections'> &
  Readonly<{
    /** 不使用 marker children 时直接提供的 canonical header input */
    header?: LogicBlockRegionInput;
    /** 不使用 marker children 时直接提供的 canonical section inputs */
    sections?: Array<LogicBlockSectionInput>;
    /** 按 authored header/section 顺序排列的 marker children */
    children?: ReactNode;
  }>;

/** LogicBlockBase header marker 的 React 参数 */
export type LogicBlockHeaderProps = Readonly<{
  padding?: LogicBlockRegionInput['padding'];
  /** Header marker 的单个 React child */
  children: ReactNode;
}>;

/** LogicBlockBase section marker 的 React 参数 */
export type LogicBlockSectionProps = Readonly<{
  sectionKey: string;
  role?: string;
  padding?: LogicBlockSectionInput['padding'];
  /** Section marker 的单个 React child */
  children: ReactNode;
}>;

const makeLogicBlockBaseComposites = () => [LogicBlockBaseDefinition];

const readMarkerChildren = (children: ReactNode): Pick<LogicBlockBaseInput, 'header' | 'sections'> => {
  let header: LogicBlockRegionInput | undefined;
  const sections: Array<LogicBlockSectionInput> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      const nested = readMarkerChildren((child.props as { children?: ReactNode }).children);
      if (nested.header !== undefined) {
        if (header !== undefined) throw new Error('LogicBlockBase accepts at most one LogicBlockHeader.');
        header = nested.header;
      }
      sections.push(...(nested.sections ?? []));
      return;
    }
    if (isValidElement<LogicBlockHeaderProps>(child) && child.type === LogicBlockHeader) {
      if (header !== undefined) throw new Error('LogicBlockBase accepts at most one LogicBlockHeader.');
      header = {
        ...(child.props.padding === undefined ? {} : { padding: child.props.padding }),
        child: convertSingleChild(child.props.children, 'LogicBlockHeader'),
      };
      return;
    }
    if (isValidElement<LogicBlockSectionProps>(child) && child.type === LogicBlockSection) {
      const props = child.props;
      sections.push({
        key: props.sectionKey,
        ...(props.role === undefined ? {} : { role: props.role }),
        ...(props.padding === undefined ? {} : { padding: props.padding }),
        child: convertSingleChild(props.children, `LogicBlockSection '${props.sectionKey}'`),
      });
      return;
    }
    throw new Error('LogicBlockBase accepts only LogicBlockHeader and LogicBlockSection direct children.');
  });
  return { ...(header === undefined ? {} : { header }), sections };
};

const logicBlockBaseEmbeddableAdapter: EmbeddableTier2Adapter<LogicBlockBaseProps> = {
  displayName: 'LogicBlockBase',
  namespace: StandardLogicBlockBaseReactNamespace,
  contribute: props => {
    const { children, header, sections, ...input } = props;
    const hasMarkerChildren = hasAuthoringChildren(children);
    if (hasMarkerChildren && (header !== undefined || sections !== undefined)) {
      throw new Error('React LogicBlockBase cannot combine marker children with header or sections props.');
    }
    const markerInput = !hasMarkerChildren
      ? { ...(header === undefined ? {} : { header }), ...(sections === undefined ? {} : { sections }) }
      : readMarkerChildren(children);
    return {
      node: createLogicBlockBase({ ...input, ...markerInput }),
      datasets: {},
      makeComposites: makeLogicBlockBaseComposites,
    };
  },
};

const LogicBlockBaseComponent: FC<LogicBlockBaseProps> = () => null;

/** 将 Standard LogicBlockBase 接入 React 编写流程的组件 */
export const LogicBlockBase = LogicBlockBaseComponent as StandardEmbeddableComponent<LogicBlockBaseProps>;

LogicBlockBase.displayName = 'LogicBlockBase';
LogicBlockBase.isTier2Embeddable = true;
LogicBlockBase.embeddableAdapter = logicBlockBaseEmbeddableAdapter;

/** 仅由直接的 LogicBlockBase 父节点消费的 header marker */
export const LogicBlockHeader: FC<LogicBlockHeaderProps> = () => {
  throw new Error('LogicBlockHeader must be used as a direct child of LogicBlockBase.');
};

LogicBlockHeader.displayName = 'LogicBlockHeader';

/** 仅由直接的 LogicBlockBase 父节点消费的 section marker */
export const LogicBlockSection: FC<LogicBlockSectionProps> = () => {
  throw new Error('LogicBlockSection must be used as a direct child of LogicBlockBase.');
};

LogicBlockSection.displayName = 'LogicBlockSection';
