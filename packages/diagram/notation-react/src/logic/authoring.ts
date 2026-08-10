import type { IRConnector } from '@retikz/notation';
import type { EmbeddableContribution } from '@retikz/react';
import type { NodeProps } from '@retikz/react';
import type { ReactElement, ReactNode } from 'react';

import { ConnectorSchema } from '@retikz/notation';
import { buildIRWithContributions, Node, Path } from '@retikz/react';
import { Children, createElement, Fragment, isValidElement } from 'react';

type IRChild = EmbeddableContribution['node'];
type SemanticNodeAuthoringInput = Readonly<{
  id: string;
  position: unknown;
}>;

/** 展开透明 Fragment，并保留非空的 authoring 节点 */
const flattenAuthoringNodes = (children: ReactNode): Array<ReactNode> => {
  const flattened: Array<ReactNode> = [];
  Children.forEach(children, child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (isValidElement(child) && child.type === Fragment) {
      flattened.push(...flattenAuthoringNodes((child as ReactElement<{ children?: ReactNode }>).props.children));
      return;
    }
    flattened.push(child);
  });
  return flattened;
};

/** 判断 React children 过滤空节点后是否仍包含 authored 内容 */
export const hasAuthoringChildren = (children: ReactNode | undefined): boolean =>
  children !== undefined && flattenAuthoringNodes(children).length > 0;

/** 把一个 authoring slot 转换为恰好一个 JSON-safe Core 子节点 */
export const convertSingleChild = (children: ReactNode, label: string): IRChild => {
  const nodes = flattenAuthoringNodes(children);
  if (nodes.length !== 1) throw new Error(`${label} must contain exactly one IRChild.`);
  const converted = buildIRWithContributions(nodes[0]).ir.children;
  if (converted.length !== 1) throw new Error(`${label} must convert to exactly one IRChild.`);
  return converted[0];
};

/** 解析组件的 plain content prop 或单个 React child，不改变 canonical 默认值 */
export const resolveContent = (
  children: ReactNode | undefined,
  content: IRChild | undefined,
  label: string,
  required: boolean,
): IRChild | undefined => {
  const authoredChildren = children === undefined ? [] : flattenAuthoringNodes(children);
  const hasChildren = authoredChildren.length > 0;
  const hasContent = content !== undefined;
  if (hasChildren && hasContent) throw new Error(`${label} accepts either content or children, not both.`);
  if (hasChildren) return convertSingleChild(children, label);
  if (hasContent) return content;
  if (required) throw new Error(`${label} requires exactly one content child.`);
  return undefined;
};

/** 复用 Core Node 的 React children 解析并返回不含 Core 判别字段的作者输入 */
export const resolveSemanticNodeInput = <TInput extends SemanticNodeAuthoringInput>(
  children: ReactNode | undefined,
  input: TInput,
): TInput => {
  const node = buildIRWithContributions(createElement(Node, input as NodeProps, children)).ir.children[0];
  if (node.type !== 'node') throw new Error('Semantic unit must convert to exactly one Core Node authoring value.');
  const { type: _type, shape: _shape, ...authored } = node;
  void _type;
  void _shape;
  return authored as TInput;
};

/** 复用 Core Path 的 React Step 解析并返回规范步骤 */
export const resolveConnectorSteps = (children: ReactNode): IRConnector['children'] => {
  const path = buildIRWithContributions(createElement(Path, null, children)).ir.children[0];
  if (path.type !== 'path' || path.children === undefined) {
    throw new Error('Connector children must convert to one Core Path Step sequence.');
  }
  return ConnectorSchema.shape.children.parse(path.children);
};
