import type { EmbeddableTier2Adapter, HydrationEventProps, NodeProps } from '@retikz/react';
import type { FrameInput, IRFrame, IRFrameDescription, IRFrameTitle } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { convertReactNodeToIR, Node } from '@retikz/react';
import { createFrame, FrameDescriptionSchema, FrameProvider, FrameTitleSchema } from '@retikz/standard';
import { Children, createElement, Fragment, isValidElement } from 'react';

import type { StandardEmbeddableComponent } from '../shared';

/** React Frame 组件接受的 Standard authoring 输入 */
export type FrameProps = Omit<FrameInput, 'children' | 'title' | 'description'> & {
  /** FrameTitle、FrameDescription 与参与 body bounds 的 Core Node children */
  children: ReactNode;
};

/** Frame 主标题接受的 JSON-safe Node authoring 字段 */
export type FrameTitleProps = Omit<NodeProps, 'position' | keyof HydrationEventProps>;

/** Frame 辅助说明接受的 JSON-safe Node authoring 字段 */
export type FrameDescriptionProps = Omit<NodeProps, 'position' | keyof HydrationEventProps>;

type FrameNode = IRFrame['children'][number];

type FrameParts = {
  body: Array<ReactNode>;
  title?: IRFrameTitle;
  description?: IRFrameDescription;
};

/** 将 React children 转为 Frame 支持的直接 Core Node */
const convertFrameChildren = (children: ReactNode): Array<FrameNode> => {
  const irChildren = convertReactNodeToIR(children).children;
  if (!irChildren.every((child): child is FrameNode => child.type === 'node' && !('namespace' in child))) {
    throw new Error('Frame only accepts direct Node children.');
  }
  return irChildren;
};

/** 复用公开 Node JSX 转换路径生成无 position 的 canonical header 输入 */
const convertHeaderProps = (
  props: FrameTitleProps | FrameDescriptionProps,
  kind: 'title' | 'description',
): IRFrameTitle | IRFrameDescription => {
  const irChildren = convertReactNodeToIR(createElement(Node, { ...props, position: [0, 0] })).children;
  if (irChildren.length !== 1) {
    throw new Error(`Frame ${kind} must convert to exactly one Core Node.`);
  }
  const child = irChildren[0];
  if (child.type !== 'node' || 'namespace' in child) {
    throw new Error(`Frame ${kind} must convert to exactly one Core Node.`);
  }
  const { type: _type, position: _position, ...header } = child;
  void _type;
  void _position;
  return kind === 'title' ? FrameTitleSchema.parse(header) : FrameDescriptionSchema.parse(header);
};

/** 从 Frame 的透明 Fragment 与直接 children 中提取唯一语义 parts */
const readFrameParts = (children: ReactNode): FrameParts => {
  const result: FrameParts = { body: [] };
  const visit = (nodes: ReactNode): void => {
    Children.forEach(nodes, child => {
      if (isValidElement(child) && child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      if (isValidElement<FrameTitleProps>(child) && child.type === FrameTitle) {
        if (result.title !== undefined) throw new Error('Frame accepts at most one FrameTitle.');
        result.title = convertHeaderProps(child.props, 'title');
        return;
      }
      if (isValidElement<FrameDescriptionProps>(child) && child.type === FrameDescription) {
        if (result.description !== undefined) throw new Error('Frame accepts at most one FrameDescription.');
        result.description = convertHeaderProps(child.props, 'description');
        return;
      }
      result.body.push(child);
    });
  };
  visit(children);
  return result;
};

const frameEmbeddableAdapter: EmbeddableTier2Adapter<FrameProps> = {
  displayName: 'Frame',
  contribute: props => {
    if ('title' in props || 'description' in props) {
      throw new Error('React Frame headers must use direct FrameTitle and FrameDescription children.');
    }
    const { children, ...input } = props;
    const parts = readFrameParts(children);
    return {
      node: createFrame({
        ...input,
        ...(parts.title !== undefined ? { title: parts.title } : {}),
        ...(parts.description !== undefined ? { description: parts.description } : {}),
        children: convertFrameChildren(parts.body),
      }),
      compositeDependencies: { roots: [FrameProvider.key], providers: [FrameProvider] },
    };
  },
};

const FrameComponent: FC<FrameProps> = () => null;

/** Standard Frame 的 React Tier 2 authoring 组件 */
export const Frame = FrameComponent as StandardEmbeddableComponent<FrameProps>;

Frame.displayName = 'Frame';
Frame.isTier2Embeddable = true;
Frame.embeddableAdapter = frameEmbeddableAdapter;

/** 声明 Frame 的 Node-like 主标题，只能作为 Frame 的直接 child */
export const FrameTitle: FC<FrameTitleProps> = () => {
  throw new Error('FrameTitle must be used as a direct child of Frame.');
};

FrameTitle.displayName = 'FrameTitle';

/** 声明 Frame 的 Node-like 辅助说明，只能作为 Frame 的直接 child */
export const FrameDescription: FC<FrameDescriptionProps> = () => {
  throw new Error('FrameDescription must be used as a direct child of Frame.');
};

FrameDescription.displayName = 'FrameDescription';
