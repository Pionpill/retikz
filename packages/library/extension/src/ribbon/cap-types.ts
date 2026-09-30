import type { IRPosition, PathCommand } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { Vector2 } from '@retikz/math';
import type { ZodType } from 'zod';

/**
 * 端帽构造时收到的端面位置、方向与已解析参数
 * @template TParams 端帽参数的 JSON 对象类型，默认 JsonObject
 */
export type RibbonCapContext<TParams extends JsonObject = JsonObject> = Readonly<{
  /** 所属端点 */
  endpoint: 'start' | 'end';
  /** Path 局部坐标中的端面中点，位于 extension 位移之前 */
  center: IRPosition;
  /** 从右侧指向左侧的单位轴 */
  sectionAxis: Vector2;
  /** 垂直端面并背离流带内部的单位向量 */
  outward: Vector2;
  /** 端面左右接点间的非负距离，单位为 user units */
  width: number;
  /** 经 schema 解析的端帽参数 */
  params: TParams;
}>;

/** 连接流带两侧的端帽开放路径，以及对两侧接点的位移 */
export type RibbonCapGeometry = Readonly<{
  /** 两侧接点沿 outward 同步移动的有限有符号距离，单位为 user units；无位移时显式返回 0 */
  extension: number;
  /**
   * Path 局部坐标中的单条连续开放命令链，以 move 开始，后续不得含 move 或 close
   * @description 接点先沿 outward 移动 extension；start 从右接点走向左接点，end 从左接点走向右接点，首尾必须匹配移动后的接点
   */
  commands: ReadonlyArray<PathCommand>;
}>;

/**
 * 内置与自定义端帽共用的参数解析和几何构造契约
 * @template TParams 端帽参数的 JSON 对象类型，关联 paramsSchema 与 resolve，默认 JsonObject
 */
export type RibbonCapDefinition<TParams extends JsonObject = JsonObject> = Readonly<{
  /** 非空且非全空白的端帽注册名，由 start.cap.name 或 end.cap.name 引用 */
  name: string;
  /** 构造前解析 cap.params 的 JSON 参数 schema；省略 cap.params 时解析 {}，可由 schema 提供默认字段 */
  paramsSchema: ZodType<TParams>;
  /** 使用已解析参数构造连接两侧接点的开放路径；坐标、接点顺序与位移须符合 RibbonCapGeometry */
  resolve: (context: RibbonCapContext<TParams>) => RibbonCapGeometry;
}>;
