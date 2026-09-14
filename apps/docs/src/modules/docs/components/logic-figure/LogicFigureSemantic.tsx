import type { GraphProps, RelationProps } from '@retikz/graph-react';
import type { FC } from 'react';

import { Graph, Relation } from '@retikz/graph-react';

import type { LogicFigureRelationKindValue } from './logic-figure-vocabulary';

import {
  logicFigureGraphProps,
  logicFigureRelationKinds,
  logicFigureRelationRoleByKind,
} from './logic-figure-vocabulary';

/** 带站点逻辑图 vocabulary 的 Graph 根参数 */
export type LogicFigureProps = Omit<GraphProps, 'entityKinds' | 'relationKinds' | 'graphRules'> &
  Readonly<{
    /** 是否注入站点 kind 对应的语义颜色规则 */
    semanticColors?: boolean;
  }>;

/** 由站点 Relation kind 确定 role 的逻辑图连线参数 */
export type LogicFigureRelationProps = Omit<RelationProps, 'role' | 'kind' | 'relationKinds'> &
  Readonly<{
    /** 站点逻辑图的稳定连线语义 */
    kind: LogicFigureRelationKindValue;
  }>;

/** 注入站点逻辑图 definition 与语义外观规则 */
export const LogicFigure: FC<LogicFigureProps> = props => {
  const { semanticColors, ...graphProps } = props;

  return <Graph {...graphProps} {...logicFigureGraphProps(semanticColors)} relationKinds={logicFigureRelationKinds} />;
};

/** 以 site kind 声明连线语义，并由 vocabulary 选择 Graph role */
export const LogicFigureRelation: FC<LogicFigureRelationProps> = props => {
  const { kind, ...relationProps } = props;

  return <Relation {...relationProps} kind={kind} role={logicFigureRelationRoleByKind[kind]} />;
};
