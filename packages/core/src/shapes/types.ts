import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { ScenePrimitive } from '../primitive';

/**
 * emit 需要的视觉样式子集
 * @description 从 NodeLayout 的样式字段收敛（不含几何 / 文本）；独立 type，不耦合内部 NodeLayout。
 *   字段名与 NodeLayout 样式字段一致（单一词汇表）。
 */
export type ShapeStyle = {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  roundedCorners?: number;
  opacity?: number;
};

/**
 * 一个 shape 的可注册定义：外接 / 边界 / anchor / emit 四件事
 * @description plain object（factory 友好：`createPolygonShape(6)` 这类普通函数返回它即可）；含函数、
 *   **不进 IR**，走 `CompileOptions.shapes` 运行时注入。内置 4 shape 也是注册项（无内置特权）。
 *
 *   坐标语义两套，第三方最易写错：
 *   - `boundaryPoint` / `anchor` 收**带 `rotate` 的 Rect**——用 re-export 的 `worldToLocal` / `localToWorld` 写局部系几何。
 *   - `emit` 收**轴对齐 Rect（rotate=0）**——旋转由编译器在外层 `GroupPrim` 统一施加。
 */
export type ShapeDefinition = {
  /**
   * 外接：内容半轴（text + padding）→ 外接框半轴。
   * @description rectangle: identity；circle: √(hw²+hh²) 两轴相等；ellipse: ×√2；diamond: ×2。
   */
  circumscribe: (
    innerHalfWidth: number,
    innerHalfHeight: number,
  ) => { halfWidth: number; halfHeight: number };
  /** 中心 → toward 射线 ∩ 边界（rect 带 rotate）。 */
  boundaryPoint: (rect: Rect, toward: Position) => Position;
  /** 命名 anchor 世界坐标；shape 不认识的名字返回 `undefined`（调用方据此抛清晰错误）。 */
  anchor: (rect: Rect, name: string) => Position | undefined;
  /** 视觉 primitive，**轴对齐空间**（rotate 由编译器外层 GroupPrim 统一施加）。 */
  emit: (rect: Rect, style: ShapeStyle, round: (n: number) => number) => Iterable<ScenePrimitive>;
};
