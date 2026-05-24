import type { MarkerPrimitive } from '../primitive/marker';

/**
 * emit 拿到的运行时上下文
 * @description compile 把已解析的 tile 周期 / 颜色 / 描边粗细传进来；def 据此在局部 tile 坐标系产 motif 几何。
 *   `color` 是 CSS 串（缺省 `currentColor`，主题反应天然——pattern motif 是 `<defs>` 内独立元素，继承 svg color）；
 *   `background` 是可选 tile 底色（缺省透明）；`lineWidth` 作线 / 网格描边宽，dots motif 用作半径。
 */
export type PatternEmitContext = {
  /** 解析后 tile 周期（user units）；= 解析后 pattern.size */
  size: number;
  /** motif 主色（CSS 串，缺省 `currentColor`） */
  color: string;
  /** tile 背景填充（CSS 串）；缺省透明（字段缺省） */
  background?: string;
  /** 线 / 网格描边宽；dots motif 用作半径 */
  lineWidth: number;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 一个 pattern 的可注册定义：默认 tile 周期 + emit
 * @description plain object（factory 友好），含函数、**不进 IR**，走 `CompileOptions.patterns` 运行时注入。
 *   内置 3 motif（lines / dots / grid）也是注册项（无内置特权，对齐 `ShapeDefinition` / `ArrowDefinition`）。
 *   `emit` 在局部 tile 坐标系产 `MarkerPrimitive` 几何（与 arrow marker 同窄子集契约——禁 text / 外部
 *   resourceRef / 递归引用），compile 把产物写进 `SceneResource.tile`、adapter 物化成 `<pattern>`。
 */
export type PatternDefinition = {
  /** tile 周期默认（user units）；用户 `pattern.size` 覆盖；缺省 8 */
  defaultSize?: number;
  /** 局部 tile 坐标 motif 几何（renderer-agnostic）；adapter 把产物物化进 `<pattern>` */
  emit: (ctx: PatternEmitContext) => Iterable<MarkerPrimitive>;
};
