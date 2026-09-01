import type { IRBlock, IRBlockHeader, IRBlockRow, IRBlockSection, IRGraph, IRGroup } from '@retikz/graph';

import {
  createBlock,
  createBlockHeader,
  createBlockRow,
  createBlockSection,
  createEntity,
  createGraph,
  createGroup,
  createRelation,
} from '@retikz/graph';
import { normalizePath } from '@retikz/vanilla';

import type {
  InputBlock,
  InputBlockHeader,
  InputBlockRow,
  InputBlockSection,
  InputEntity,
  InputGraph,
  InputGraphChild,
  InputGroup,
  InputRelation,
} from './types';

/** 将 Entity authoring 输入组装为单个 Source record */
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

/** 将 Graph-family semantic child 或普通 Vanilla child 组装为 Source child */
export const normalizeGraphChild = (child: InputGraphChild) => {
  if ('namespace' in child) return child;
  switch (child.type) {
    case 'graph':
      return normalizeGraph(child);
    case 'group':
      return normalizeGroup(child);
    case 'block':
      return normalizeBlock(child);
    case 'blockHeader':
      return normalizeBlockHeader(child);
    case 'blockSection':
      return normalizeBlockSection(child);
    case 'blockRow':
      return normalizeBlockRow(child);
    case 'entity':
      return normalizeEntity(child);
    case 'relation':
      return normalizeRelation(child);
    default:
      return child;
  }
};

/** 将 Block Header authoring 输入组装为独立 Source composite */
export const normalizeBlockHeader = (input: InputBlockHeader): IRBlockHeader => {
  const { type: _type, icon, trail, ...header } = input;
  void _type;
  return createBlockHeader({
    ...header,
    ...(icon === undefined ? {} : { icon: normalizeGraphChild(icon) }),
    ...(trail === undefined ? {} : { trail: normalizeGraphChild(trail) }),
  });
};

/** 将 Block Section authoring 输入组装为独立 Source composite */
export const normalizeBlockSection = (input: InputBlockSection): IRBlockSection => {
  const { type: _type, children, ...section } = input;
  void _type;
  return createBlockSection({
    ...section,
    ...(children === undefined ? {} : { children: children.map(normalizeGraphChild) }),
  });
};

/** 将 Block Row authoring 输入组装为独立 Source composite */
export const normalizeBlockRow = (input: InputBlockRow): IRBlockRow => {
  if (input.content !== undefined) {
    const { type: _type, content, children: _children, ...row } = input;
    void _type;
    void _children;
    return createBlockRow({ ...row, content });
  }
  const { type: _type, content: _content, children, ...row } = input;
  void _type;
  void _content;
  return createBlockRow({
    ...row,
    ...(children === undefined
      ? {}
      : {
          children: children.map(normalizeGraphChild),
        }),
  });
};

/** 将 Block 开放内容 authoring 输入组装为单个 Source composite */
export const normalizeBlock = (input: InputBlock): IRBlock => {
  const { type: _type, children, ...block } = input;
  void _type;
  return createBlock({
    ...block,
    ...(children === undefined ? {} : { children: children.map(normalizeGraphChild) }),
  });
};

/** 将 Group authoring 输入组装为单个 Source composite */
export const normalizeGroup = (input: InputGroup): IRGroup => {
  const { type: _type, children, ...group } = input;
  void _type;
  return createGroup({
    ...group,
    ...(children === undefined ? {} : { children: children.map(normalizeGraphChild) }),
  });
};

/** 将 collocated Graph authoring 输入组装为最小单 record Source root */
export const normalizeGraph = (input: InputGraph): IRGraph => {
  const { type: _type, children, ...graph } = input;
  void _type;
  return createGraph({
    ...graph,
    ...(children === undefined ? {} : { children: children.map(normalizeGraphChild) }),
  });
};
