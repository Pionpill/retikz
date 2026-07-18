import type { Position } from '@retikz/math';
import type { ZodType } from 'zod';

import type { IRJsonObject } from '../../schemas';
import type { PathCommand } from '../scene';

/**
 * path generator 的运行时上下文
 * @description 坐标均位于当前 Path 的局部坐标系，返回的命令由所属 GroupPrim 统一应用 scope transform
 */
export type PathGeneratorGenerateContext = {
  /** 当前游标局部坐标（上一段终点 / sub-path 起点） */
  from: Position;
  /**
   * step.to resolve 后的局部坐标
   * 缺省表示 step 未给 `to`
   */
  to?: Position;
  /** paramsSchema 校验后的参数对象 */
  params: Record<string, unknown>;
  /** targetParams 顶层 key 到当前 Path 局部坐标的解析结果 */
  resolvedTargets: Record<string, Position>;
  /** 精度取整函数，与 compile/render 使用同一 round */
  round: (n: number) => number;
};

/**
 * 可注册的 path generator 定义
 * @description 描述 JSON 参数、可解析 target 参数和命令生成能力；定义本身不进入 IR
 */
export type PathGeneratorDefinition = {
  /** generator 名称，由 generator step 的 `name` 引用 */
  name: string;
  /**
   * 实例参数 schema
   * @description 解析结果必须是 JSON object
   */
  paramsSchema: ZodType<IRJsonObject>;
  /**
   * 需要解析为当前 Path 局部坐标的 params 顶层 key
   * @default []
   */
  targetParams?: Array<string>;
  /**
   * 根据上下文生成低层 path 命令
   * @description 返回命令使用与上下文一致的局部坐标；可返回 `move` 形成 sub-path
   */
  generate: (ctx: PathGeneratorGenerateContext) => Array<PathCommand>;
};
