import type { IRPosition, PathCommand } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { Vector2 } from '@retikz/math';
import type { ZodType } from 'zod';

/** 端帽消费的端面局部坐标基底 */
export type RibbonCapContext<TParams extends JsonObject = JsonObject> = Readonly<{
  /** 所属端点 */
  endpoint: 'start' | 'end';
  /** 端面中点 */
  center: IRPosition;
  /** 从右侧指向左侧的单位轴 */
  sectionAxis: Vector2;
  /** 垂直端面并背离流带内部的单位向量 */
  outward: Vector2;
  /** 端面弦长 */
  width: number;
  /** 经 schema 解析的端帽参数 */
  params: TParams;
}>;

/** 端帽开放路径及其接点延伸 */
export type RibbonCapGeometry = Readonly<{
  /** 沿 outward 的有符号接点位移 */
  extension: number;
  /** Path 局部坐标中的单条开放命令链 */
  commands: ReadonlyArray<PathCommand>;
}>;

/** 内置和第三方端帽共同实现的能力 */
export type RibbonCapDefinition<TParams extends JsonObject = JsonObject> = Readonly<{
  /** 端帽注册名 */
  name: string;
  /** JSON 参数解析契约 */
  paramsSchema: ZodType<TParams>;
  /** 构造从一侧接点通往另一侧的端帽 */
  resolve: (context: RibbonCapContext<TParams>) => RibbonCapGeometry;
}>;
