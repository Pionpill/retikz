import type { IRLine, IRNodeLabel } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { InputNode, NodeOptions } from '@retikz/vanilla';
import type { FC, ReactElement, ReactNode } from 'react';
import { Fragment, isValidElement } from 'react';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';
import type { HydrationEventProps } from '../../hydration';
import { KernelDisplayName, getDisplayName, mergeLabels } from '../../shared';
import type { NodeLabelProps } from './NodeLabel';
import { convertTextProps } from './Text';
import type { TextProps } from './Text';

/** 可定位、可连接的节点输入，组合文字、视觉形状和连接面 */
export type NodeProps = Omit<NodeOptions, 'text'> &
  HydrationEventProps &
  (
    | { text: NonNullable<NodeOptions['text']>; children?: ReactElement | ReadonlyArray<ReactElement> }
    | {
        text?: never;
        /** 节点文字或带样式的 Text 子元素，可混排 NodeLabel；无正文时可省略 */
        children?: ReactNode;
      }
  );

/**
 * 绘图节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = KernelDisplayName.Node;

/** 按普通换行拆 Node 文本，同时保留 display TeX 内部的换行 */
const splitChildTextLines = (text: string): Array<string> => {
  /** 判断字符串中的当前位置是否被反斜杠转义 */
  const isEscapedAt = (sourceText: string, index: number): boolean => {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && sourceText[cursor] === '\\'; cursor -= 1) slashCount += 1;
    return slashCount % 2 === 1;
  };

  const lines: Array<string> = [];
  let start = 0;
  let inDisplayTex = false;

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '$' && text[index + 1] === '$' && !isEscapedAt(text, index)) {
      inDisplayTex = !inDisplayTex;
      index += 1;
      continue;
    }

    if (text[index] === '\n' && !inDisplayTex) {
      lines.push(text.slice(start, index));
      start = index + 1;
    }
  }

  lines.push(text.slice(start));

  return lines;
};

/** 收集 Node children 中的作者文本行 */
const collectNodeContent = (children: ReactNode) => {
  const labels: Array<IRNodeLabel> = [];
  const lines: Array<IRLine> = [];
  let buffer = '';
  let hasBuffer = false;

  const flush = (): void => {
    if (hasBuffer) lines.push(buffer);
    buffer = '';
    hasBuffer = false;
  };

  const append = (text: string): void => {
    buffer += text;
    hasBuffer = true;
  };

  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      const parts = splitChildTextLines(node);
      append(parts[0] ?? '');

      for (let index = 1; index < parts.length; index += 1) {
        flush();
        append(parts[index] ?? '');
      }

      return;
    }

    if (typeof node === 'number') {
      append(String(node));
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }

    if (!isValidElement(node)) return;
    if (node.type === Fragment) {
      visit((node.props as { children?: ReactNode }).children);
      return;
    }

    if (getDisplayName(node) === KernelDisplayName.NodeLabel) {
      const { children: text, ...options } = node.props as NodeLabelProps;
      labels.push({ ...options, text });
      return;
    }
    if (getDisplayName(node) === KernelDisplayName.Text) {
      flush();
      lines.push(convertTextProps(node.props as TextProps));
      return;
    }

    if (typeof node.type === 'function') visit((node.type as (props: unknown) => ReactNode)(node.props));
  };

  visit(children);
  flush();

  const text = lines.length === 1 ? lines[0] : undefined;
  return { labels, text: typeof text === 'string' ? text : lines.length ? lines : undefined };
};

/** 把 <Node> props 组装为 Vanilla InputNode */
export const convertNodeProps = (props: NodeProps): InputNode => {
  const content = props.children === undefined ? undefined : collectNodeContent(props.children);
  if (props.text !== undefined && content?.text !== undefined)
    throw new RetikzReactError(RetikzReactErrorCode.Kernel, 'Node 不能同时指定 text 和 JSX 正文');
  const text = props.text ?? content?.text;
  const label = content ? mergeLabels(props.label, content.labels) : props.label;
  return {
    type: 'node',
    ...pickDefined(props, [
      'position',
      'id',
      'aliasIds',
      'shape',
      'boundary',
      'meta',
      'animations',
      'rotate',
      'cornerRadius',
      'scale',
      'zIndex',
      'style',
      'layout',
      'authoring',
    ]),
    ...(label === undefined ? {} : { label }),
    ...(text === undefined ? {} : { text }),
  };
};
