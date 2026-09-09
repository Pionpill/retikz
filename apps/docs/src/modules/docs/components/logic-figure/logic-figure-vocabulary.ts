import type { IRGraphRule } from '@retikz/graph';
import type { GraphProps } from '@retikz/graph-react';

import { defineEntityKind, defineRelationKind, RelationRole } from '@retikz/graph';

/** Docs 逻辑图使用的稳定 Entity kind */
export const LogicFigureEntityKind = {
  Important: 'docs.logic.important',
  ImportantData: 'docs.logic.importantData',
  Secondary: 'docs.logic.secondary',
  Algorithm: 'docs.logic.algorithm',
} as const;

/** Docs 逻辑图使用的 Entity kind 值 */
export type LogicFigureEntityKindValue = (typeof LogicFigureEntityKind)[keyof typeof LogicFigureEntityKind];

/** Docs 逻辑图使用的稳定 Relation kind */
export const LogicFigureRelationKind = {
  ControlFlow: 'docs.logic.control-flow',
  DataFlow: 'docs.logic.data-flow',
  Dependency: 'docs.logic.dependency',
  Feedback: 'docs.logic.feedback',
} as const;

/** Docs 逻辑图使用的 Relation kind 值 */
export type LogicFigureRelationKindValue = (typeof LogicFigureRelationKind)[keyof typeof LogicFigureRelationKind];

const logicFigureEntityDefinitions = [
  defineEntityKind({
    kind: LogicFigureEntityKind.Important,
    role: 'participant',
    description: 'Important logic content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Important,
    role: 'activity',
    description: 'Important logic content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Important,
    role: 'concept',
    description: 'Important logic content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.ImportantData,
    role: 'event',
    description: 'Important data, data structure, type, or schema',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.ImportantData,
    role: 'state',
    description: 'Important data, data structure, type, or schema',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.ImportantData,
    role: 'gateway',
    description: 'Important data, data structure, type, or schema',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.ImportantData,
    role: 'resource',
    description: 'Important data, data structure, type, or schema',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'participant',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'activity',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'event',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'state',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'gateway',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'resource',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Secondary,
    role: 'concept',
    description: 'Secondary or background content',
  }),
  defineEntityKind({
    kind: LogicFigureEntityKind.Algorithm,
    role: 'activity',
    description: 'Algorithmic, high-complexity, or performance-sensitive logic',
  }),
] as const;

const logicFigureRelationDefinitions = [
  defineRelationKind({
    kind: LogicFigureRelationKind.ControlFlow,
    role: RelationRole.Flow,
    description: '真实控制流、调用链或主要执行次序',
  }),
  defineRelationKind({
    kind: LogicFigureRelationKind.DataFlow,
    role: RelationRole.Flow,
    description: '在真实处理链路中传递的数据或 payload',
  }),
  defineRelationKind({
    kind: LogicFigureRelationKind.Dependency,
    role: RelationRole.Dependency,
    description: '不属于主要执行通道的工具或运行时依赖',
    directions: { forward: { dashPattern: [6, 4] } },
  }),
  defineRelationKind({
    kind: LogicFigureRelationKind.Feedback,
    role: RelationRole.Flow,
    description: '把结果送回前序阶段的真实反馈流',
    directions: { forward: { dashPattern: [6, 4] } },
  }),
] as const;

const logicFigureRules: Array<IRGraphRule> = [
  {
    type: 'entity',
    selector: { kind: LogicFigureEntityKind.Important },
    style: { color: 'dodgerblue' },
  },
  {
    type: 'entity',
    selector: { kind: LogicFigureEntityKind.ImportantData },
    style: { color: 'darkorange' },
  },
  {
    type: 'entity',
    selector: { kind: LogicFigureEntityKind.Secondary },
    style: { color: 'gray' },
  },
  {
    type: 'entity',
    selector: { kind: LogicFigureEntityKind.Algorithm },
    style: { color: 'darkviolet' },
  },
  {
    type: 'relation',
    selector: { kind: LogicFigureRelationKind.DataFlow },
    style: { color: 'darkorange', stroke: 'darkorange' },
  },
  {
    type: 'relation',
    selector: {
      kind: [LogicFigureRelationKind.ControlFlow, LogicFigureRelationKind.Dependency, LogicFigureRelationKind.Feedback],
    },
    style: { color: 'gray', stroke: 'gray' },
  },
];

/** Docs Relation kind 对应的稳定 Graph role */
export const logicFigureRelationRoleByKind: Readonly<Record<LogicFigureRelationKindValue, string>> = {
  [LogicFigureRelationKind.ControlFlow]: RelationRole.Flow,
  [LogicFigureRelationKind.DataFlow]: RelationRole.Flow,
  [LogicFigureRelationKind.Dependency]: RelationRole.Dependency,
  [LogicFigureRelationKind.Feedback]: RelationRole.Flow,
};

/** 为需要自行决定 semantic rule 优先级的 Graph 提供 Docs logic vocabulary 参数 */
export const logicFigureGraphProps = (
  semanticColors = true,
): Pick<GraphProps, 'entityKinds' | 'relationKinds' | 'graphRules'> => ({
  entityKinds: logicFigureEntityDefinitions,
  relationKinds: logicFigureRelationDefinitions,
  ...(semanticColors ? { graphRules: logicFigureRules } : {}),
});
