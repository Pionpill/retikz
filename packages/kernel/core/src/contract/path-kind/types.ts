import type { z } from 'zod';

import type { IRJsonObject, IRPathBase, IRPosition, JsonValue } from '../../schemas';
import type { AnyInspectorDefinition, InspectorDefinition, StrokePathInspectionSubject } from '../inspection';
import type { ScenePrimitive } from '../scene';

/**
 * path kind 编译结果
 * @description path kind definition 把高层 path 形态编译成当前 Path 局部坐标系中的 Scene primitive，
 *   并返回同一坐标系内参与 bbox / transform 计算的关键点集合
 */
export type PathKindCompileResult<TInspectionSubject extends JsonValue = never> = {
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: Array<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的 layout 与路径级 rotate / scale 几何依据 */
  boundsPoints: Array<IRPosition>;
} & ([TInspectionSubject] extends [never] ? { inspectionSubject?: never } : { inspectionSubject: TInspectionSubject });

/** 异构 registry 消费 Path kind 结果时使用的擦除形态 */
export type AnyPathKindCompileResult = Readonly<{
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: ReadonlyArray<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的布局与变换几何依据 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** owner 声明 Inspector 时携带的 settled subject */
  inspectionSubject?: JsonValue;
}>;

/** 内置 stroke emitter 的可选 inspection subject 请求 */
export type EmitStrokeInspectionOptions = Readonly<{ includeInspectionSubject: true }>;

/** 复用内置 stroke compile 的 overload contract */
export type EmitStroke = {
  /** 只返回普通 Path kind compile 结果 */
  (path?: IRPathBase): PathKindCompileResult | null;
  /** 同时返回由最终 settled commands 组成的 inspection subject */
  (
    path: IRPathBase | undefined,
    options: EmitStrokeInspectionOptions,
  ): PathKindCompileResult<StrokePathInspectionSubject> | null;
};

/**
 * path kind 编译上下文
 * @description 自定义 kind 可以完全接管输出，也可以调用回调复用标准描边或 ribbon 逻辑
 */
export type PathKindCompileContext<TOptions = IRJsonObject> = {
  /** 正在编译的 IR path */
  path: IRPathBase;
  /** 经 `optionsSchema` 解析后的 kind 配置项 */
  options: TOptions;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`
   * @default 使用当前 `path`
   */
  emitStroke: EmitStroke;
  /**
   * 复用 core 标准 ribbon 编译逻辑；不传 path 时使用当前 `path`
   * @default 使用当前 `path`
   */
  emitRibbon: (path?: IRPathBase) => PathKindCompileResult | null;
};

/**
 * path kind 注册项
 * @description 扩展 path 的 `kind` 编译能力；定义本身不进入 IR
 */
export type PathKindInspectionBranch<
  TInspectionSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
> = [TInspectionSubject] extends [never]
  ? Readonly<{ inspectionSubjectSchema?: never; inspector?: never }>
  : Readonly<{
      /** selected occurrence 的 inspection subject schema */
      inspectionSubjectSchema: z.ZodType<TInspectionSubject>;
      /** 与 compile subject 泛型绑定的 Path Inspector */
      inspector: InspectorDefinition<'path', TInspectionSubject, TOptionsInput, TResolvedOptions>;
    }>;

export type PathKindDefinition<
  TOptions = IRJsonObject,
  TInspectionSubject extends JsonValue = never,
  TInspectionOptionsInput extends IRJsonObject = IRJsonObject,
  TResolvedInspectionOptions extends IRJsonObject = IRJsonObject,
> = {
  /** 该 path kind 的 IR schema；`kind` 字段必须是非空 `z.literal(...)` */
  schema: z.ZodObject<{ kind: z.ZodLiteral<string> }>;
  /**
   * kind 配置项的额外校验 schema；缺省直接使用原始 `kindOptions ?? {}`
   * @default 原始 `kindOptions ?? {}`
   */
  optionsSchema?: z.ZodType<TOptions>;
  /** 把该 path kind 编译成 Scene primitive；返回 null 表示该 path 不产生输出 */
  compile: (context: PathKindCompileContext<TOptions>) => PathKindCompileResult<TInspectionSubject> | null;
} & PathKindInspectionBranch<TInspectionSubject, TInspectionOptionsInput, TResolvedInspectionOptions>;

/** registry 中擦除 subject 与 options 泛型后的 Path kind 定义 */
export type AnyPathKindDefinition = Readonly<{
  /** 该 Path kind 的 IR schema */
  schema: z.ZodObject<{ kind: z.ZodLiteral<string> }>;
  /** 可选 kind options schema */
  optionsSchema?: z.ZodType;
  /** 只在恢复当前 definition 后调用的擦除编译入口 */
  compile: (context: never) => AnyPathKindCompileResult | null;
  /** 可选 inspection subject schema */
  inspectionSubjectSchema?: z.ZodType;
  /** 可选 Path Inspector */
  inspector?: AnyInspectorDefinition & Readonly<{ kind: 'path' }>;
}>;
