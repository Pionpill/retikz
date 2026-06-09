import type { MarkerFill, MarkerPrimitive } from '../primitive/marker';

/**
 * emit 拿到的运行时上下文
 * @description framework 把宿主 path 已解析的颜色 / 描边粗细传进来；def 据此产 marker 几何。
 *   `stroke` / `fill` 是 `MarkerFill`（纯色串或 `{ kind: 'contextStroke' }`，无 override 时取 contextStroke
 *   继承 path stroke、主题反应不冻结）——可直接当 marker primitive 的 `fill` / `stroke` 用，无需收窄。
 */
export type ArrowEmitContext = {
  /** 描边颜色（无 override 时 = `{ kind: 'contextStroke' }`，继承 path stroke） */
  stroke: MarkerFill;
  /** 填充颜色（实心箭头主导色；空心箭头由 framework 据 `hollow` 处理后传入） */
  fill: MarkerFill;
  /** 描边粗细（marker 局部坐标，user units）；空心箭头据此画外轮廓 */
  lineWidth: number;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 一个 arrow 的可注册定义：几何尺寸 + emit
 * @description plain object（factory 友好），含函数、**不进 IR**，走 `CompileOptions.arrows` 运行时注入。
 *   内置 8 箭头也是注册项（无内置特权，对齐 `ShapeDefinition` / `BUILTIN_SHAPES`）。
 *
 *   `lineContactX` 存**静态 base**（不含 lineWidth 调整）：实心 normal/diamond/circle = 0、stealth = 3、
 *   open/openDiamond base = 1、openStealth base = 3、openCircle base = 0.75。framework 对 `hollow: true` 的 def 统一减
 *   `lineWidth/2` 得到实际 refX / shrink 接触点（这条调整由编译器 / adapter 落，def 只声明静态 base）。
 */
export type ArrowDefinition = {
  /** marker 局部基准边长（viewBox `0 0 baseSize baseSize`，refY = baseSize/2）；缺省 10 */
  baseSize?: number;
  /** 空心标志：true 时 framework 丢 fill、color 主导描边、启用 lineWidth；并对 lineContactX 减 lineWidth/2 */
  hollow?: boolean;
  /** 线接触点静态 base（决定 path shrink + marker refX）；空心 def 由 framework 再减 lineWidth/2 */
  lineContactX: number;
  /** 尖端 x（shrink 用）；缺省 = baseSize */
  tipX?: number;
  /** 默认箭头长度（length fallback）；缺省 6 */
  defaultLength?: number;
  /** 默认箭头宽度（width fallback）；缺省 6 */
  defaultWidth?: number;
  /** 局部坐标 marker 几何（renderer-agnostic）；adapter 把产物嵌进 `<marker>` */
  emit: (ctx: ArrowEmitContext) => Iterable<MarkerPrimitive>;
};
