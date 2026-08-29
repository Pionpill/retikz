import type { MarkerFill, MarkerPrimitive } from '../scene';

/**
 * arrow emit 的运行时上下文
 * @description 提供已解析的颜色、描边粗细和取整函数，供定义生成 marker 几何
 */
export type ArrowEmitContext = {
  /** 描边颜色（无 override 时 = `{ kind: 'contextStroke' }`，继承 path stroke） */
  stroke: MarkerFill;
  /** 填充颜色（实心箭头主导色；空心箭头会按 `hollow` 处理后传入） */
  fill: MarkerFill;
  /** 描边粗细（marker 局部坐标，user units）；空心箭头据此画外轮廓 */
  lineWidth: number;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 可注册的 arrow 定义
 * @description 描述箭头 marker 的尺寸、接触点和几何生成能力；定义本身不进入 IR
 */
export type ArrowDefinition = {
  /** arrow 名称，由 IR `arrowDetail.shape` 引用 */
  name: string;
  /**
   * marker 局部基准边长（viewBox `0 0 baseSize baseSize`，refY = baseSize/2）；缺省 10
   * @default 10
   */
  baseSize?: number;
  /**
   * 空心标志：true 时由描边表达外轮廓，并按 lineWidth 修正接触点
   * @default false
   */
  hollow?: boolean;
  /** 线接触点静态 base，决定 path shrink 与 marker refX */
  lineContactX: number;
  /**
   * 外轮廓补偿量（marker 局部坐标）；缺省时空心箭头用 lineWidth/2，实心箭头用 0
   * @default hollow ? lineWidth / 2 : 0
   */
  outerInset?: number;
  /**
   * 尖端 x（shrink 用）；缺省 = baseSize
   * @default baseSize
   */
  tipX?: number;
  /**
   * 默认箭头长度（length fallback）；缺省 8
   * @default 8
   */
  defaultLength?: number;
  /**
   * 默认箭头宽度（width fallback）；缺省 8
   * @default 8
   */
  defaultWidth?: number;
  /** 局部坐标 marker 几何（renderer-agnostic）；adapter 把产物嵌进 `<marker>` */
  emit: (ctx: ArrowEmitContext) => Iterable<MarkerPrimitive>;
};
