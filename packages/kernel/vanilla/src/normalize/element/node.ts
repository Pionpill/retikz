import type { IRNode } from '@retikz/core';

/** 作者侧节点输入 */
export type InputNode = IRNode & {
  /** 可选编译结果扩展解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 将作者侧节点输入组装为 Source IR */
export const normalizeNode = (input: InputNode): IRNode => {
  if (!('authoring' in input)) return input;
  const { authoring: _authoring, ...node } = input;
  void _authoring;
  return node;
};
