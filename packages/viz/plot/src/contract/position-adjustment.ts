import type { ExternalRow } from '@retikz/data';
import type { ValueOf } from '@retikz/foundation';
import type { Position } from '@retikz/math';
import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzPlotError } from '../error';
import type { IRPlotPositionAdjustmentOperation } from '../schemas';
import type { MarkChannels } from './channel';
import type { CoordinateFrame, DimensionRole } from './coordinate';
import type { PositionScale } from './scale';

/** Position Adjustment 的执行空间 */
export const PositionAdjustmentSpace = {
  /** position scale 已映射、coordinate 尚未投影的角色空间 */
  Role: 'role',
  /** coordinate 已投影、mark geometry 尚未生成的屏幕空间 */
  Screen: 'screen',
} as const;

/** Position Adjustment 的执行空间值 */
export type PositionAdjustmentSpace = ValueOf<typeof PositionAdjustmentSpace>;

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
  /** 标识尺度已映射、坐标尚未投影的角色空间 */
  space: 'role';
  /** 映射值数组采用的位置角色顺序 */
  roles: ReadonlyArray<DimensionRole>;
  /** 各位置角色绑定的有效尺度 */
  roleScales: Readonly<Partial<Record<DimensionRole, PositionScale>>>;
  /** 包含角色映射结果的待调整目标 */
  targets: ReadonlyArray<MappedMarkPlacementTarget>;
  /** 当前绘图区宽度 */
  width: number;
  /** 当前绘图区高度 */
  height: number;
};

/** screen-space initializer 的执行上下文 */
export type ScreenPositionAdjustmentContext = {
  /** 标识坐标投影后的屏幕空间 */
  space: 'screen';
  /** 数据目标采用的位置角色顺序 */
  roles: ReadonlyArray<DimensionRole>;
  /** 包含屏幕投影位置的待调整目标 */
  targets: ReadonlyArray<ProjectedMarkPlacementTarget>;
  /** 供调整算法查询视觉尺寸等信息的通道集合 */
  channels: MarkChannels;
  /** 当前绘图区宽度 */
  width: number;
  /** 当前绘图区高度 */
  height: number;
};

/** role-space initializer 返回的单个目标 */
export type RolePositionAdjustmentResultTarget = {
  /** 与输入目标对应的稳定键 */
  key: string;
  /** 按角色顺序排列的调整后映射值；无有效位置时为 null */
  mappedRoles: ReadonlyArray<number> | null;
};

/** screen-space initializer 返回的单个目标 */
export type ScreenPositionAdjustmentResultTarget = {
  /** 与输入目标对应的稳定键 */
  key: string;
  /** 调整后的屏幕坐标；无有效位置时为 null */
  position: Position | null;
};

/** role-space adjustment 的保守偏移包络 */
export type RolePositionAdjustmentEnvelope = {
  /** 标识包络使用尺度输出后的角色坐标 */
  space: 'role';
  /** 各角色向数值两侧可能产生的最大偏移 */
  byRole: Partial<
    Record<
      DimensionRole,
      {
        /** 向角色数值减小一侧的最大偏移量 */
        lower: number;
        /** 向角色数值增大一侧的最大偏移量 */
        upper: number;
      }
    >
  >;
};

/** screen-space adjustment 的保守偏移包络 */
export type ScreenPositionAdjustmentEnvelope = {
  /** 标识包络使用屏幕坐标 */
  space: 'screen';
  /** 可能向左产生的最大偏移量 */
  left: number;
  /** 可能向右产生的最大偏移量 */
  right: number;
  /** 可能向上产生的最大偏移量 */
  top: number;
  /** 可能向下产生的最大偏移量 */
  bottom: number;
};

/** Position Adjustment 的保守偏移包络 */
export type PositionAdjustmentEnvelope = RolePositionAdjustmentEnvelope | ScreenPositionAdjustmentEnvelope;

/**
 * 在角色坐标空间调整位置的能力定义
 * @template TOperation schema 校验后用于角色空间位移初始化及包络测量的操作类型
 */
export type RolePositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = {
  /** 将调整安排在尺度映射之后、坐标投影之前 */
  space: 'role';
  /** 解析调整操作的 schema，kind 字面量作为注册键 */
  schema: ZodType<TOperation>;
  /** 供绘图区留白计算使用的保守偏移包络能力 */
  containment?: {
    /** 要求布局为声明的调整包络预留空间 */
    policy: 'contain';
    /** 测量角色坐标中调整可能产生的保守偏移范围 */
    measure: (operation: TOperation, context: RolePositionAdjustmentContext) => RolePositionAdjustmentEnvelope;
  };
  /** 计算目标的最终角色映射值，并按稳定键返回 */
  initialize: (
    operation: TOperation,
    context: RolePositionAdjustmentContext,
  ) => ReadonlyArray<RolePositionAdjustmentResultTarget>;
};

/**
 * 在屏幕坐标空间调整位置的能力定义
 * @template TOperation schema 校验后用于屏幕空间位移初始化及包络测量的操作类型
 */
export type ScreenPositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = {
  /** 将调整安排在坐标投影之后、图元生成之前 */
  space: 'screen';
  /** 解析调整操作的 schema，kind 字面量作为注册键 */
  schema: ZodType<TOperation>;
  /** 供绘图区留白计算使用的保守偏移包络能力 */
  containment?: {
    /** 要求布局为声明的调整包络预留空间 */
    policy: 'contain';
    /** 测量屏幕坐标中调整可能产生的保守偏移范围 */
    measure: (operation: TOperation, context: ScreenPositionAdjustmentContext) => ScreenPositionAdjustmentEnvelope;
  };
  /** 计算目标的最终屏幕位置，并按稳定键返回 */
  initialize: (
    operation: TOperation,
    context: ScreenPositionAdjustmentContext,
  ) => ReadonlyArray<ScreenPositionAdjustmentResultTarget>;
};

/**
 * Runtime Position Adjustment Definition；不进入 Plot IR
 * @template TOperation 位移定义 schema 与初始化回调共享的操作类型
 */
export type PositionAdjustmentDefinition<
  TOperation extends IRPlotPositionAdjustmentOperation = IRPlotPositionAdjustmentOperation,
> = RolePositionAdjustmentDefinition<TOperation> | ScreenPositionAdjustmentDefinition<TOperation>;

/** Position Adjustment Definition 的作者入口 */
export type DefinePositionAdjustment = {
  /**
   * 定义角色空间的位置调整
   * @template TOperation 该空间的 schema、包络测量与位置初始化共同消费的操作类型
   */
  <TOperation extends IRPlotPositionAdjustmentOperation>(
    definition: RolePositionAdjustmentDefinition<TOperation>,
  ): RolePositionAdjustmentDefinition<TOperation>;
  /**
   * 定义屏幕空间的位置调整
   * @template TOperation 该空间的 schema、包络测量与位置初始化共同消费的操作类型
   */
  <TOperation extends IRPlotPositionAdjustmentOperation>(
    definition: ScreenPositionAdjustmentDefinition<TOperation>,
  ): ScreenPositionAdjustmentDefinition<TOperation>;
};

/** 定义一个 Position Adjustment Definition */
export const definePositionAdjustment = ((definition: unknown) => definition) as DefinePositionAdjustment;

/** Position Adjustment registry 内部宽类型 */
export type AnyPositionAdjustmentDefinition =
  | {
      /** 决定调整发生在角色映射后还是屏幕投影后 */
      space: 'role';
      /** 解析调整操作的 schema，kind 字面量作为注册键 */
      schema: ZodType;
      /** 供绘图区留白计算使用的保守偏移包络能力 */
      containment?: {
        /** 要求布局为声明的调整包络预留空间 */
        policy: 'contain';
        /** 测量声明坐标空间中调整可能产生的保守偏移范围 */
        measure: (operation: never, context: RolePositionAdjustmentContext) => RolePositionAdjustmentEnvelope;
      };
      /** 在声明空间中计算调整结果，并按输入目标的稳定键返回 */
      initialize: (
        operation: never,
        context: RolePositionAdjustmentContext,
      ) => ReadonlyArray<RolePositionAdjustmentResultTarget>;
    }
  | {
      /** 决定调整发生在角色映射后还是屏幕投影后 */
      space: 'screen';
      /** 解析调整操作的 schema，kind 字面量作为注册键 */
      schema: ZodType;
      /** 供绘图区留白计算使用的保守偏移包络能力 */
      containment?: {
        /** 要求布局为声明的调整包络预留空间 */
        policy: 'contain';
        /** 测量声明坐标空间中调整可能产生的保守偏移范围 */
        measure: (operation: never, context: ScreenPositionAdjustmentContext) => ScreenPositionAdjustmentEnvelope;
      };
      /** 在声明空间中计算调整结果，并按输入目标的稳定键返回 */
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
  /** 包含角色值与最终屏幕位置的目标列表 */
  targets: ReadonlyArray<ProjectedMarkPlacementTarget>;
  /** 按稳定 target key 读取最终屏幕位置 */
  positionFor: (key: string) => Position | null;
};

/** Position Adjustment 执行时的公共上下文 */
export type PositionAdjustmentExecutionContext = {
  /** 提供角色、尺度与坐标投影能力的有效坐标帧 */
  frame: CoordinateFrame;
  /** 当前 mark 已解析的视觉通道集合 */
  channels: MarkChannels;
  /** 当前绘图区宽度 */
  width: number;
  /** 当前绘图区高度 */
  height: number;
};
