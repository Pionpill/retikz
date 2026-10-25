import type { IRArrowStyle } from '../../schemas';
import type { PaintValue, ScenePrimitive } from '../scene';

/**
 * arrow emit 的运行时上下文
 * @description 提供已解析的颜色、描边粗细和取整函数，供定义生成 marker 几何
 */
export type ArrowEmitContext = {
  /** 有效描边；实心定义默认无轮廓，空心定义缺少主色时继承宿主描边 */
  stroke: PaintValue;
  /** 填充颜色（实心箭头主导色；空心箭头会按 `hollow` 处理后传入） */
  fill: PaintValue;
  /** 描边粗细（marker 局部坐标，user units）；空心箭头据此画外轮廓 */
  lineWidth: number;
  /** 已解析的虚线节奏；省略时使用定义自身的默认 */
  dashPattern?: IRArrowStyle['dashPattern'];
  /** 已解析的虚线偏移 */
  dashOffset?: IRArrowStyle['dashOffset'];
  /** 已解析的描边端帽 */
  lineCap?: IRArrowStyle['lineCap'];
  /** 已解析的描边连接；省略时使用定义自身的默认 */
  lineJoin?: IRArrowStyle['lineJoin'];
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * 可注册的 arrow 定义
 * @description 描述箭头 marker 的尺寸、接触点和几何生成能力；定义本身不进入 IR
 */
export type ArrowDefinition = {
  /** 箭头注册名称，供端点箭头与箭头形标记的 shape 引用 */
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
  /** marker 基础几何沿箭头轴向承诺的包络后缘，必须不晚于线接触点 */
  backX: number;
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
  /**
   * 根据已解析样式，生成箭头局部坐标中的基础场景图元
   * @description 编译时调用，由定义将上下文样式应用到生成的图元。外层负责箭头的缩放、旋转和定位，渲染后端负责实际绘制
   * @param ctx 已解析的填充、描边样式及精度取整函数
   * @returns 组成箭头外观的基础场景图元序列，使用本定义的 baseSize 局部坐标系
   */
  emit: (ctx: ArrowEmitContext) => Iterable<ScenePrimitive>;
};

/**
 * 定义 arrow 注册项
 * @param def 箭头名称、尺寸及几何生成函数组成的定义
 * @returns 原定义对象，不复制或修改输入
 * @remarks 当前是 typed identity；保留入口用于对齐 registry API，并为未来校验或归一化预留空间
 */
export const defineArrow = (def: ArrowDefinition): ArrowDefinition => def;
