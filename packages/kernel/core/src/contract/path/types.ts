import type { Position } from '@retikz/math';
import type { z, ZodType } from 'zod';

import type { IRJsonObject, IRPathBase, IRPosition } from '../../schemas';
import type { PathCommand, ScenePrimitive } from '../scene';

/**
 * path generator 的运行时上下文。
 * @description 坐标均为世界坐标。
 */
export type PathGeneratorGenerateContext = {
  /** 当前游标世界坐标（上一段终点 / sub-path 起点） */
  from: Position;
  /**
   * step.to resolve 后的世界坐标。
   * @default undefined；step 未给 `to`
   */
  to?: Position;
  /** paramsSchema 校验后的参数对象（运行时仍标 unknown 值，generator 自行收窄） */
  params: Record<string, unknown>;
  /** targetParams 顶层 key → 世界坐标（NodeTarget 已 resolve） */
  resolvedTargets: Record<string, Position>;
  /**
   * 精度取整函数（与 compile/render 同一 round，保几何一致）。
   */
  round: (n: number) => number;
};

/**
 * 可注册的 path generator 定义。
 * @description 描述 JSON 参数、可解析 target 参数和命令生成能力；定义本身不进入 IR。
 */
export type PathGeneratorDefinition = {
  /** generator 名称，由 generator step 的 `name` 引用。 */
  name: string;
  /**
   * 实例参数 schema。
   * @description 解析结果必须是 JSON object。
   */
  paramsSchema: ZodType<IRJsonObject>;
  /**
   * 需要解析为世界坐标的 params 顶层 key。
   * @default []
   */
  targetParams?: Array<string>;
  /**
   * 根据上下文生成低层 path 命令。
   * @description 可返回 `move` 形成 sub-path。
   */
  generate: (ctx: PathGeneratorGenerateContext) => Array<PathCommand>;
};

/**
 * path kind 编译结果
 * @description path kind definition 把高层 path 形态编译成 Scene primitive，并返回参与 bbox / transform
 *   计算的关键点集合。
 */
export type PathKindCompileResult = {
  /** 实际渲染输出。 */
  primitives: Array<ScenePrimitive>;
  /** layout 与路径级 rotate / scale 的几何依据。 */
  points: Array<IRPosition>;
};

/**
 * path kind 编译上下文
 * @description 自定义 kind 可以完全接管输出，也可以调用回调复用标准描边或 ribbon 逻辑。
 */
export type PathKindCompileContext<TOptions = IRJsonObject> = {
  /** 正在编译的 IR path。 */
  path: IRPathBase;
  /** 经 `optionsSchema` 解析后的 kind 配置项。 */
  options: TOptions;
  /**
   * 复用 core 标准描边编译逻辑；不传 path 时使用当前 `path`。
   * @default 使用当前 `path`
   */
  emitStroke: (path?: IRPathBase) => PathKindCompileResult | null;
  /**
   * 复用 core 标准 ribbon 编译逻辑；不传 path 时使用当前 `path`。
   * @default 使用当前 `path`
   */
  emitRibbon: (path?: IRPathBase) => PathKindCompileResult | null;
};

/**
 * path kind 注册项
 * @description 扩展 path 的 `kind` 编译能力；定义本身不进入 IR。
 */
export type PathKindDefinition<TOptions = IRJsonObject> = {
  /** 该 path kind 的 IR schema；`kind` 字段必须是非空 `z.literal(...)`。 */
  schema: z.ZodObject<{ kind: z.ZodLiteral<string> }>;
  /**
   * kind 配置项的额外校验 schema；缺省直接使用原始 `kindOptions ?? {}`。
   * @default 原始 `kindOptions ?? {}`
   */
  optionsSchema?: z.ZodType<TOptions>;
  /** 把该 path kind 编译成 Scene primitive；返回 null 表示该 path 不产生输出。 */
  compile: (context: PathKindCompileContext<TOptions>) => PathKindCompileResult | null;
};
