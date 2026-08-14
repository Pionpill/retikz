import type { HydrationEventProps, NodeProps, ReactInputEmbedContext } from '@retikz/react';
import type { FrameInput } from '@retikz/standard';
import type { InputFrame, InputFrameHeaders } from '@retikz/standard-vanilla';
import type { InputNode } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import { createInputScene, Node, withInputEmbedAdapters } from '@retikz/react';
import { FrameInputEmbedAdapter } from '@retikz/standard-vanilla';
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

type FrameParts = {
  body: Array<ReactNode>;
  title?: InputNode;
  description?: InputNode;
};

/** 收集 Node-like header JSX 为延后归一化的 Vanilla InputNode */
const convertHeaderProps = (
  props: FrameTitleProps | FrameDescriptionProps,
  kind: 'title' | 'description',
): InputNode => {
  const input = createInputScene(createElement(Node, { ...props, position: [0, 0] }));
  const children = input.scene.children;
  if (children === undefined || children.length !== 1) {
    throw new Error(`Frame ${kind} must contain exactly one Core Node authoring input.`);
  }
  const child = children[0];
  if (child.type !== 'node' || 'namespace' in child) {
    throw new Error(`Frame ${kind} must contain exactly one Core Node authoring input.`);
  }
  return child;
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

/** 将 Frame marker 与 Node children 收集为 Standard Vanilla Input */
const createFrameInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  if ('title' in props || 'description' in props) {
    throw new Error('React Frame headers must use direct FrameTitle and FrameDescription children.');
  }
  const { children, ...input } = props as FrameProps;
  const parts = readFrameParts(children);
  const bodyInput = createInputScene(parts.body, { embedIdPrefix: `${context.id}:body` });
  const childrenInput = bodyInput.scene.children;
  if (childrenInput === undefined) {
    throw new Error('Frame body must use direct child authoring.');
  }
  const headers: InputFrameHeaders = {
    ...(parts.title === undefined ? {} : { title: parts.title }),
    ...(parts.description === undefined ? {} : { description: parts.description }),
  };
  const inputProps: InputFrame = {
    ...input,
    children: childrenInput,
    ...(Object.keys(headers).length === 0 ? {} : { headers }),
  };
  return withInputEmbedAdapters(inputProps, bodyInput.adapters);
};

const FrameComponent: FC<FrameProps> = () => null;

/** Standard Frame 的 React Tier 2 authoring 组件 */
export const Frame = FrameComponent as StandardEmbeddableComponent<FrameProps>;

Frame.displayName = 'Frame';
Frame.isTier2Embeddable = true;
Frame.inputEmbedAdapter = FrameInputEmbedAdapter;
Frame.createInputEmbedProps = createFrameInput;

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
