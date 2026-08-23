import type { IRChild } from '@retikz/core';
import type { IRGraph, IRGraphEntity, IRGraphRelation } from '@retikz/graph';
import type { InputEntity, InputGraph, InputGraphChild, InputRelation } from '@retikz/graph-vanilla';

/** 从确定的 IRGraph 恢复的 Graph Vanilla authoring 形态 */
export type GraphPreviewAuthoringInput = Omit<InputGraph, 'children'> &
  Readonly<{ children?: ReadonlyArray<InputGraphChild> }>;

/** 将 Entity Source 转回带 authoring discriminator 的 Vanilla 输入 */
export const entityPreviewAuthoringInput = (value: IRGraphEntity): InputEntity => {
  const { namespace: _namespace, ...input } = value;
  void _namespace;
  return input;
};

/** 将 Relation Source 转回带 authoring discriminator 的 Vanilla 输入 */
export const relationPreviewAuthoringInput = (value: IRGraphRelation): InputRelation => {
  const { namespace: _namespace, ...input } = value;
  void _namespace;
  return input;
};

const isGraphMember = (child: IRChild): child is IRGraphEntity | IRGraphRelation =>
  'namespace' in child && child.namespace === 'graph' && (child.type === 'entity' || child.type === 'relation');

/** 将单 record IRGraph 转回结构一致的公开 Graph Vanilla 输入 */
export const graphPreviewAuthoringInput = (graph: IRGraph): GraphPreviewAuthoringInput => {
  const { namespace: _namespace, type: _type, children, ...input } = graph;
  void _namespace;
  void _type;
  return {
    ...input,
    ...(children === undefined
      ? {}
      : {
          children: children.map(child =>
            isGraphMember(child)
              ? child.type === 'entity'
                ? entityPreviewAuthoringInput(child)
                : relationPreviewAuthoringInput(child)
              : child,
          ),
        }),
  };
};
