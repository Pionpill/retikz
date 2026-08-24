import type { IRScope } from '@retikz/core';

import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGraph } from '../../schemas';

import { resolveGraph } from '../../resolve';

/** 从 Graph Source 提取完整 Core Scope props，移除 Graph-only context 与 composite discriminator */
export const graphScopeProps = (source: IRGraph): Omit<IRScope, 'type' | 'children'> => {
  const { namespace: _namespace, type: _type, graphTheme: _graphTheme, children: _children, ...scope } = source;
  void _namespace;
  void _type;
  void _graphTheme;
  void _children;
  return scope;
};

/** 把 Graph Source root 下沉为一个保留完整 Scope 语义的普通 Core Scope */
export const lowerGraph = (source: IRGraph, options: ResolvedGraphDefinitionOptions): IRScope => ({
  type: 'scope',
  ...graphScopeProps(source),
  children: resolveGraph(source, options),
});
