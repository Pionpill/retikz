import type { IRGraph, IRGroup } from '@retikz/graph';

import { createEntity, createGraph, createGroup, createRelation } from '@retikz/graph';
import { normalizePath } from '@retikz/vanilla';

import type { InputEntity, InputGraph, InputGraphChild, InputGroup, InputGroupChild, InputRelation } from './types';

/** 将 Entity authoring 输入校验为单个 Source record */
export const normalizeEntity = (input: InputEntity) => {
  const { type, ...entity } = input;
  void type;
  return createEntity(entity);
};

/** 将可选 Way sugar 归一为直接持有 route 的 Relation Source record */
export const normalizeRelation = (input: InputRelation) => {
  const { type, way, ...relation } = input;
  void type;
  if (way === undefined) return createRelation(relation);
  return createRelation({
    ...relation,
    route: normalizePath({ way }).children,
  });
};

/** 将 Graph root 的混合 authoring child 归一为 Source child */
const normalizeGraphChild = (child: InputGraphChild) => {
  if (!('namespace' in child)) {
    if (child.type === 'entity') return normalizeEntity(child);
    if (child.type === 'relation') return normalizeRelation(child);
  }
  return child;
};

/** 将 collocated Graph authoring 输入归一化为最小单 record Source root */
export const normalizeGraph = (input: InputGraph): IRGraph => {
  const { children, ...graph } = input;
  return createGraph({
    ...graph,
    ...(children === undefined ? {} : { children: children.map(normalizeGraphChild) }),
  });
};

/** 将 Group 的混合 authoring child 归一为 Source child */
const normalizeGroupChild = (child: InputGroupChild) => normalizeGraphChild(child);

/** 将 Group authoring 输入归一化为单个 Source composite */
export const normalizeGroup = (input: InputGroup): IRGroup => {
  const { children, ...group } = input;
  return createGroup({
    ...group,
    ...(children === undefined ? {} : { children: children.map(normalizeGroupChild) }),
  });
};
