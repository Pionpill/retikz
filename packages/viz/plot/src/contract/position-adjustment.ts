import type { ExternalRow } from '@retikz/data';
import type { Position } from '@retikz/math';
import type { ZodType } from 'zod';

import { ZodLiteral, ZodObject } from 'zod';

import type { IRPlotPositionAdjustmentOperation } from '../schemas';
import type { MarkChannels } from './channel';
import type { CoordinateFrame, DimensionRole } from './coordinate';
import type { PositionScale } from './scale';

import { RetikzPlotError } from '../error';

/** Position Adjustment 的执行空间 */
export const PositionAdjustmentSpace = {
  /** position scale 已映射、coordinate 尚未投影的角色空间 */
  Role: 'role',
  /** coordinate 已投影、mark geometry 尚未生成的屏幕空间 */
  Screen: 'screen',
} as const;

/** Position Adjustment 的执行空间值 */
export type PositionAdjustmentSpaceValue = (typeof PositionAdjustmentSpace)[keyof typeof PositionAdjustmentSpace];

/** Mark 暴露给 placement pipeline 的稳定目标 */
export type MarkPlacementTarget = {
  /** 同一 Mark operation 内唯一且确定的目标键 */
  key: string;
  /** 目标对应的有效数据行 */
  row: ExternalRow;
  /** 按 `frame.roles` 排列的原始角色值 */
  roleValues: ReadonlyArray<unknown>;
};

/** 已完成 position scale 映射的 placement 目标 */
export type MappedMarkPlacementTarget = MarkPlacementTarget & {
  /** 按 frame roles 排列的映射值；原始角色无效时为 null */
  mappedRoles: ReadonlyArray<number> | null;
};

/** 已完成 coordinate projection 的 placement 目标 */
export type ProjectedMarkPlacementTarget = MappedMarkPlacementTarget & {
  /** 最终屏幕位置；映射或投影无效时为 null */
  position: Position | null;
};

/** role-space initializer 的执行上下文 */
export type RolePositionAdjustmentContext = {
  space: 'role';
  roles: ReadonlyArray<DimensionRole>;
  roleScales: Readonly<Partial<Record<DimensionRole, PositionScale>>>;
  targets: ReadonlyArray<MappedMarkPlacementTarget>;
  width: number;
  height: number;
};

/** screen-space initializer 的执行上下文 */
export type ScreenPositionAdjustmentContext = {
  space: 'screen';
  roles: ReadonlyArray<DimensionRole>;
  targets: ReadonlyArray<ProjectedMarkPlacementTarget>;
  channels: MarkChannels;
  width: number;
  height: number;
};

/** role-space initializer 返回的单个目标 */
export type RolePositionAdjustmentResultTarget = {
  key: string;
  mappedRoles: ReadonlyArray<number> | null;
};

/** screen-space initializer 返回的单个目标 */
export type ScreenPositionAdjustmentResultTarget = {
  key: string;
  position: Position | null;
};

/** role-space adjustment 的保守偏移包络 */
export type RolePositionAdjustmentEnvelope = {
  space: 'role';
  byRole: Partial<Record<DimensionRole, { lower: number; upper: number }>>;
};

/** screen-space adjustment 的保守偏移包络 */
export type ScreenPositionAdjustmentEnvelope = {
  space: 'screen';
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Position Adjustment 的保守偏移包络 */
export type PositionAdjustmentEnvelope = RolePositionAdjustmentEnvelope | ScreenPositionAdjustmentEnvelope;

/** role-space Position Adjustment Definition */
export type RolePositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = {
  space: 'role';
  schema: ZodType<TOperation>;
  containment?: {
    policy: 'contain';
    measure: (operation: TOperation, context: RolePositionAdjustmentContext) => RolePositionAdjustmentEnvelope;
  };
  initialize: (
    operation: TOperation,
    context: RolePositionAdjustmentContext,
  ) => ReadonlyArray<RolePositionAdjustmentResultTarget>;
};

/** screen-space Position Adjustment Definition */
export type ScreenPositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = {
  space: 'screen';
  schema: ZodType<TOperation>;
  containment?: {
    policy: 'contain';
    measure: (operation: TOperation, context: ScreenPositionAdjustmentContext) => ScreenPositionAdjustmentEnvelope;
  };
  initialize: (
    operation: TOperation,
    context: ScreenPositionAdjustmentContext,
  ) => ReadonlyArray<ScreenPositionAdjustmentResultTarget>;
};

/** Runtime Position Adjustment Definition；不进入 Plot IR */
export type PositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = RolePositionAdjustmentDefinition<TOperation> | ScreenPositionAdjustmentDefinition<TOperation>;

/** Position Adjustment Definition 的作者入口 */
export type DefinePositionAdjustment = {
  <TOperation extends IRPlotPositionAdjustmentOperation>(
    definition: RolePositionAdjustmentDefinition<TOperation>,
  ): RolePositionAdjustmentDefinition<TOperation>;
  <TOperation extends IRPlotPositionAdjustmentOperation>(
    definition: ScreenPositionAdjustmentDefinition<TOperation>,
  ): ScreenPositionAdjustmentDefinition<TOperation>;
};

/** 定义一个 Position Adjustment Definition */
export const definePositionAdjustment = ((definition: unknown) => definition) as DefinePositionAdjustment;

/** Position Adjustment registry 内部宽类型 */
export type AnyPositionAdjustmentDefinition =
  | {
      space: 'role';
      schema: ZodType;
      containment?: {
        policy: 'contain';
        measure: (operation: never, context: RolePositionAdjustmentContext) => RolePositionAdjustmentEnvelope;
      };
      initialize: (
        operation: never,
        context: RolePositionAdjustmentContext,
      ) => ReadonlyArray<RolePositionAdjustmentResultTarget>;
    }
  | {
      space: 'screen';
      schema: ZodType;
      containment?: {
        policy: 'contain';
        measure: (operation: never, context: ScreenPositionAdjustmentContext) => ScreenPositionAdjustmentEnvelope;
      };
      initialize: (
        operation: never,
        context: ScreenPositionAdjustmentContext,
      ) => ReadonlyArray<ScreenPositionAdjustmentResultTarget>;
    };

/** 从 Definition schema 的 `kind` literal 提取 registry key */
export const extractPositionAdjustmentKind = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject)) {
    throw new RetikzPlotError(
      'lowerPlots: position adjustment registration schema must be a ZodObject with a literal kind field',
    );
  }
  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzPlotError(
      'lowerPlots: position adjustment registration schema must declare kind as a non-empty z.literal string',
    );
  }
  return kindSchema.value;
};

/** 一次 placement 执行的最终位置结果 */
export type MarkPositionResolution = {
  targets: ReadonlyArray<ProjectedMarkPlacementTarget>;
  /** 按稳定 target key 读取最终屏幕位置 */
  positionFor: (key: string) => Position | null;
};

/** Position Adjustment 执行时的公共上下文 */
export type PositionAdjustmentExecutionContext = {
  frame: CoordinateFrame;
  channels: MarkChannels;
  width: number;
  height: number;
};
