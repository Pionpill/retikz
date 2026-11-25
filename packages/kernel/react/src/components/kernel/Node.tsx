import type { IRLine, IRNode } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { AssertEqual } from '@retikz/foundation';
import type { InputNode, NodeOptions } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { Fragment, isValidElement } from 'react';

import type { HydrationEventProps } from '../../hydration';
import { KernelDisplayName, getDisplayName } from '../../shared';
import { textElementToLineSpec } from './Text';

/** 可定位、可连接的节点输入，组合文字、视觉形状和连接面 */
export type NodeProps = NodeOptions &
  HydrationEventProps & {
    /** 节点文字或带样式的 Text 子元素；显式 text 优先 */
    children?: ReactNode;
  };

/**
 * Node 声明一个可引用的节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到
 *   SVG 或 Canvas
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = KernelDisplayName.Node;

/**
 * IRNode 纯透传字段表（除 type / position / text / label 特化字段外）
 * @description as const satisfies 拒不存在的 key；下方 _NodeFieldsCheck 静态校验完备性——未来 IRNode 加新字段时漏写此表 TS 编译期报错
 */
const NODE_FIELDS = [
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
] as const satisfies ReadonlyArray<keyof IRNode>;

// 完备性互锁：NODE_FIELDS 必须恰好覆盖 IRNode 除特化字段外的所有 key
type _NodeFieldsCheck = AssertEqual<
  (typeof NODE_FIELDS)[number],
  Exclude<keyof IRNode, 'type' | 'position' | 'text' | 'label'>
>;

const _assertNodeFieldsCheck: _NodeFieldsCheck = true;
void _assertNodeFieldsCheck;

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
const collectChildLines = (children: unknown): Array<IRLine> => {
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

    if (getDisplayName(node) === KernelDisplayName.Text) {
      const line = textElementToLineSpec(node);
      if (line !== undefined) {
        flush();
        lines.push(line);
      }

      return;
    }

    if (typeof node.type === 'function') visit((node.type as (props: unknown) => ReactNode)(node.props));
  };

  visit(children);
  flush();

  return lines;
};

/** 读取 Node 的显式 text 或 JSX children */
const readNodeText = (props: NodeProps): IRNode['text'] => {
  if (typeof props.text === 'string' || Array.isArray(props.text)) return props.text;

  const lines = collectChildLines(props.children);
  if (lines.length === 0) return undefined;

  return lines.length === 1 && typeof lines[0] === 'string' ? lines[0] : lines;
};

/** 把 <Node> props 组装为 Vanilla InputNode */
export const inputNodeFromProps = (props: NodeProps): InputNode => {
  const text = readNodeText(props);
  return {
    type: 'node',
    ...(props.position === undefined ? {} : { position: props.position }),
    ...pickDefined(props, NODE_FIELDS),
    ...(text === undefined ? {} : { text }),
    ...(props.label === undefined ? {} : { label: props.label }),
    ...(props.authoring === undefined ? {} : { authoring: props.authoring }),
  };
};
