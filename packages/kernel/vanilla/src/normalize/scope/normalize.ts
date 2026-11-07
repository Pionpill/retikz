import type { IRChild, IRScope } from '@retikz/core';

import type { InputChild } from '../scene';
import type { InputScope } from './types';

/** 由场景 normalizer 注入的已归一子节点函数 */
export type ScopeChildrenNormalizer = (children: ReadonlyArray<InputChild>) => Array<IRChild>;

/** 将作者侧 Scope 输入组装为 Source IR */
export const normalizeScopeWithChildren = (input: InputScope, normalizeChildren: ScopeChildrenNormalizer): IRScope => {
  const { type: _type, authoring: _authoring, children, transforms, ...scope } = input;
  void _type;
  void _authoring;

  return {
    type: 'scope',
    ...scope,
    ...(transforms === undefined ? {} : { transforms: [...transforms] }),
    children: normalizeChildren(children),
  };
};
