import type { MarkerPrimitive } from '../scene';

/**
 * pattern emit 的运行时上下文
 * @description 提供 tile 周期、颜色、可选描边粗细和取整函数，供定义生成 motif 几何
 */
export type PatternEmitContext = {
  /** 解析后 tile 周期（user units）；= 解析后 pattern.size */
  size: number;
  /** motif 主色（CSS 串，缺省 `currentColor`） */
  color: string;
  /**
   * tile 背景填充（CSS 串）；缺省透明（字段缺省）
   * @default 透明背景
   */
  background?: string;
  /**
   * 线 / 网格描边宽；dots motif 用作半径
   * @description 仅当用户在 `pattern.lineWidth` 显式给值时存在；缺省时由 motif 自行决定默认值
   * @default motif 自定义默认值
   */
  lineWidth?: number;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 可注册的 pattern 定义
 * @description 描述默认 tile 周期和 motif 几何生成能力；定义本身不进入 IR
 */
export type PatternDefinition = {
  /** pattern 名称，由 IR pattern paint 的 `shape` 引用 */
  name: string;
  /**
   * tile 周期默认（user units）；用户 `pattern.size` 覆盖；缺省 8
   * @default 8
   */
  defaultSize?: number;
  /** 局部 tile 坐标中的 motif 几何 */
  emit: (ctx: PatternEmitContext) => Iterable<MarkerPrimitive>;
};
