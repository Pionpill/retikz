import type { NodeProps } from '@retikz/react';
import type { InputChild, InputNode, InputPath } from '@retikz/vanilla';
import type { ReactElement, ReactNode } from 'react';

import { createInputScene, Node, Path } from '@retikz/react';
import { Children, createElement, Fragment, isValidElement } from 'react';

/** 由 React 收集、等待 Vanilla adapter 在根 Scene traversal 中归一化的 authoring 子项 */
export type CollectedAuthoringChild = Readonly<{
  child: InputChild;
  adapters: ReturnType<typeof createInputScene>['adapters'];
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

/** 收集一组 authored React children 与其递归使用的 Vanilla adapters */
export const collectAuthoringChildren = (
  children: ReactNode | undefined,
  embedIdPrefix: string,
): Readonly<{
  children: ReadonlyArray<InputChild>;
  adapters: ReturnType<typeof createInputScene>['adapters'];
}> => {
  const input = createInputScene(children, { embedIdPrefix });
  return { children: input.scene.children ?? [], adapters: input.adapters };
};

/** 收集一个 authoring slot 的唯一 Input child */
export const collectSingleChild = (
  children: ReactNode,
  label: string,
  embedIdPrefix: string,
): CollectedAuthoringChild => {
  const nodes = flattenAuthoringNodes(children);
  if (nodes.length !== 1) throw new Error(`${label} must contain exactly one authoring child.`);
  const input = createInputScene(nodes[0], { embedIdPrefix });
  const childrenInput = input.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error(`${label} must contain exactly one authoring child.`);
  }
  return { child: childrenInput[0], adapters: input.adapters };
};

/** 收集语义 Node 的 React props 与文字 child，不在 React 内归一化 */
export const collectSemanticNodeInput = <TInput extends Readonly<Record<string, unknown>>>(
  children: ReactNode | undefined,
  input: TInput,
  embedIdPrefix: string,
): Readonly<{
  input: Omit<TInput, 'id'> & { authoringNode: InputNode };
  adapters: ReturnType<typeof createInputScene>['adapters'];
}> => {
  const nodeInput = createInputScene(createElement(Node, input as unknown as NodeProps, children), { embedIdPrefix });
  const childrenInput = nodeInput.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error('Graph semantic unit must contain exactly one Core Node authoring input.');
  }
  const child = childrenInput[0];
  if (child.type !== 'node' || 'namespace' in child) {
    throw new Error('Graph semantic unit must contain exactly one Core Node authoring input.');
  }
  const { id: _id, ...base } = input;
  void _id;
  return { input: { ...base, authoringNode: child }, adapters: nodeInput.adapters };
};

/** 收集 Relation children 为等待 Vanilla 归一化的 Core Path 输入 */
export const collectRelationPath = (
  children: ReactNode,
  embedIdPrefix: string,
): Readonly<{
  child: InputPath;
  adapters: ReturnType<typeof createInputScene>['adapters'];
}> => {
  const pathInput = createInputScene(createElement(Path, null, children), { embedIdPrefix });
  const childrenInput = pathInput.scene.children;
  if (childrenInput === undefined || childrenInput.length !== 1) {
    throw new Error('Relation children must contain one Core Path authoring input.');
  }
  return { child: childrenInput[0] as InputPath, adapters: pathInput.adapters };
};
