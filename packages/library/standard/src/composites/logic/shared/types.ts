import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type {
  CalloutSide,
  ConnectorBendDirection,
  ConnectorOrthogonalPattern,
  ConnectorRole,
  ConnectorRouteKind,
  JunctionRole,
  LogicCompositeType,
  TerminalRole,
} from './constants';
import type {
  CalloutSideSchema,
  ConnectorAppearanceSchema,
  ConnectorBendDirectionSchema,
  ConnectorOrthogonalPatternSchema,
  ConnectorRouteKindSchema,
  LogicBlockRegionSchema,
  LogicBlockSectionSchema,
  LogicDiagramPointSchema,
  LogicDiagramTargetSchema,
  LogicGeometryLabelSchema,
  LogicLayoutItemArtifactSchema,
  LogicOuterArtifactSchema,
  LogicOutlineAppearanceSchema,
  LogicUnitAppearanceSchema,
  TerminalRoleSchema,
} from './schema';
import type { LogicNeutralStyle } from './schema';

/** 逻辑 composite 判别值联合 */
export type LogicCompositeTypeValue = ValueOf<typeof LogicCompositeType>;

/** Terminal 闭合 role 联合 */
export type TerminalRoleValue = ValueOf<typeof TerminalRole>;

/** Connector role 词汇值联合 */
export type ConnectorRoleValue = ValueOf<typeof ConnectorRole>;

/** Junction role 词汇值联合 */
export type JunctionRoleValue = ValueOf<typeof JunctionRole>;

/** Connector 路由变体联合 */
export type ConnectorRouteKindValue = ValueOf<typeof ConnectorRouteKind>;

/** Connector 正交模式联合 */
export type ConnectorOrthogonalPatternValue = ValueOf<typeof ConnectorOrthogonalPattern>;

/** Connector 弯曲方向联合 */
export type ConnectorBendDirectionValue = ValueOf<typeof ConnectorBendDirection>;

/** Callout 放置方向联合 */
export type CalloutSideValue = ValueOf<typeof CalloutSide>;

/** 逻辑图 target 持久化类型 */
export type LogicDiagramTarget = z.infer<typeof LogicDiagramTargetSchema>;

/** 逻辑图端点或显式折点类型 */
export type LogicDiagramPoint = z.infer<typeof LogicDiagramPointSchema>;

/** 逻辑图 target 作者输入 */
export type LogicDiagramTargetInput = z.input<typeof LogicDiagramTargetSchema>;

/** 逻辑图端点或折点作者输入 */
export type LogicDiagramPointInput = z.input<typeof LogicDiagramPointSchema>;

/** 逻辑单元外观规范类型 */
export type LogicUnitAppearance = z.infer<typeof LogicUnitAppearanceSchema>;

/** 逻辑单元外观作者输入 */
export type LogicUnitAppearanceInput = z.input<typeof LogicUnitAppearanceSchema>;

/** LogicBlockBase region 类型 */
export type LogicBlockRegion = z.infer<typeof LogicBlockRegionSchema>;

/** LogicBlockBase region 作者输入 */
export type LogicBlockRegionInput = z.input<typeof LogicBlockRegionSchema>;

/** LogicBlockBase section 类型 */
export type LogicBlockSection = z.infer<typeof LogicBlockSectionSchema>;

/** LogicBlockBase section 作者输入 */
export type LogicBlockSectionInput = z.input<typeof LogicBlockSectionSchema>;

/** LogicBlockBase divider outline 外观类型 */
export type LogicOutlineAppearance = z.infer<typeof LogicOutlineAppearanceSchema>;

/** LogicBlockBase divider outline 外观作者输入 */
export type LogicOutlineAppearanceInput = z.input<typeof LogicOutlineAppearanceSchema>;

/** Connector 与 leader 共用的 Core Path 外观类型 */
export type ConnectorAppearance = z.infer<typeof ConnectorAppearanceSchema>;

/** Connector 与 leader 共用的 Core Path 外观作者输入 */
export type ConnectorAppearanceInput = z.input<typeof ConnectorAppearanceSchema>;

/** Callout side 类型，由 schema 派生以保持公开输入一致 */
export type CalloutSideSchemaValue = z.infer<typeof CalloutSideSchema>;

/** LogicLayoutItemArtifact 严格类型 */
export type LogicLayoutItemArtifact = z.infer<typeof LogicLayoutItemArtifactSchema>;

/** LogicOuterArtifact 严格类型 */
export type LogicOuterArtifact = z.infer<typeof LogicOuterArtifactSchema>;

/** Core step label 输入类型 */
export type LogicGeometryLabelInput = z.input<typeof LogicGeometryLabelSchema>;

/** LogicBlockBase 中性样式规范字面量 */
export type LogicNeutralStyleValue = typeof LogicNeutralStyle;

/** Terminal role schema 输出 */
export type TerminalRoleSchemaValue = z.infer<typeof TerminalRoleSchema>;

/** Connector route kind schema 输出 */
export type ConnectorRouteKindSchemaValue = z.infer<typeof ConnectorRouteKindSchema>;

/** Connector pattern schema 输出 */
export type ConnectorOrthogonalPatternSchemaValue = z.infer<typeof ConnectorOrthogonalPatternSchema>;

/** Connector bend direction schema 输出 */
export type ConnectorBendDirectionSchemaValue = z.infer<typeof ConnectorBendDirectionSchema>;
