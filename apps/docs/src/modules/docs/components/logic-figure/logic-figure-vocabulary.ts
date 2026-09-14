import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import type { GraphProps } from '@retikz/graph-react';

import { defineThemeStyle, ThemeMode } from '@retikz/core';
import { defineFlowThemeStyle } from '@retikz/diagram/flow';
import { defineEntityKind, defineGraphThemeStyle, defineRelationKind, RelationRole } from '@retikz/graph';

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
  Secondary: 'docs.logic.secondary',
} as const;

/** Docs 逻辑图使用的 Relation kind 值 */
export type LogicFigureRelationKindValue = (typeof LogicFigureRelationKind)[keyof typeof LogicFigureRelationKind];

/** Docs 逻辑图在 React 与 Vanilla 中共用的 Entity kind definitions */
export const logicFigureEntityDefinitions = [
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

export const logicFigureRelationKinds: NonNullable<GraphProps['relationKinds']> = [
  defineRelationKind({
    kind: LogicFigureRelationKind.Secondary,
    role: RelationRole.Dependency,
    description: 'Secondary logic relationship',
    directions: { forward: { dashPattern: [6, 4] } },
  }),
] as const;

const logicFigureThemeName = 'docs.logic';

/** 站点逻辑图沿用 Core 默认色板，只在 Graph 层提供语义外观 */
export const logicFigureCoreThemeStyle = defineThemeStyle({ name: logicFigureThemeName, resolve: () => ({}) });

/** 站点逻辑图不覆盖 Diagram 布局默认值 */
export const logicFigureDiagramThemeStyle = {
  name: logicFigureThemeName,
  resolve: () => ({}),
};

/** 站点逻辑图不覆盖 Flow 布局默认值 */
export const logicFigureFlowThemeStyle = defineFlowThemeStyle({ name: logicFigureThemeName, resolve: () => ({}) });

/** Secondary 使用独立于主色与 group 的中性浅底，状态由文字颜色保留 */
export const logicFigureGraphThemeStyle = defineGraphThemeStyle({
  name: logicFigureThemeName,
  resolve: theme => ({
    rules: [
      {
        type: 'entity',
        selector: { kind: LogicFigureEntityKind.Secondary },
        style: {
          stroke: 'none',
          fill: theme.mode === ThemeMode.Light ? '#e4e4e4' : '#1b1b1b',
          textColor: theme.mode === ThemeMode.Light ? '#555555' : '#bbbbbb',
        },
      },
      ...(['error', 'success', 'warning', 'disabled'] as const).map(status => ({
        type: 'entity' as const,
        selector: { kind: LogicFigureEntityKind.Secondary, status },
        style: { textColor: theme.colors.semantic[status === 'disabled' ? 'guide' : status] },
      })),
    ],
  }),
});

type LogicFigureFlowGraphProps = Pick<FlowDiagramProps, 'entityKinds' | 'graphRules' | 'theme' | 'graphThemeStyles'>;

const logicFigureRules: NonNullable<LogicFigureFlowGraphProps['graphRules']> = [
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
    selector: { kind: LogicFigureEntityKind.Algorithm },
    style: { color: 'darkviolet' },
  },
];

/** Docs Relation kind 对应的稳定 Graph role */
export const logicFigureRelationRoleByKind: Readonly<Record<LogicFigureRelationKindValue, string>> = {
  [LogicFigureRelationKind.Secondary]: RelationRole.Dependency,
};

/** 为需要自行决定 semantic rule 优先级的 Graph 提供 Docs logic vocabulary 参数 */
export const logicFigureGraphProps = (semanticColors = true): LogicFigureFlowGraphProps => ({
  theme: { style: logicFigureThemeName },
  graphThemeStyles: [logicFigureGraphThemeStyle],
  entityKinds: logicFigureEntityDefinitions,
  ...(semanticColors ? { graphRules: logicFigureRules } : {}),
});
