import type { z } from 'zod';

import type { IRJsonObject, IRPathBase, IRPosition } from '../../schemas';
import type { ScenePrimitive } from '../scene';

/**
 * path kind 编译结果。
 * @description path kind definition 把高层 path 形态编译成当前 Path 局部坐标系中的 Scene primitive，
 *   并返回同一坐标系内参与 bbox / transform 计算的关键点集合
 */
export type PathKindCompileResult = {
  /** 当前 Path 局部坐标系中的实际渲染输出 */
  primitives: Array<ScenePrimitive>;
  /** 当前 Path 局部坐标系中的 layout 与路径级 rotate / scale 几何依据 */
  boundsPoints: Array<IRPosition>;
};

/**
 * path kind 编译上下文。
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
 * path kind 注册项。
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
