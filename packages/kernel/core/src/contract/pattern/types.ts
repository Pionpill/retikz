import type { IRPatternLineStyle, IRPatternPaintSpec } from '../../schemas';
import type { MarkerPrimitive } from '../scene';

/** Pattern definition 消费的已解析线条样式 */
export type ResolvedPatternLineStyle = {
  /** motif 描边颜色 */
  color: string;
  /** motif 描边宽度 */
  lineWidth?: IRPatternLineStyle['lineWidth'];
  /** 已解析的描边 dash pattern */
  dashPattern?: IRPatternLineStyle['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPatternLineStyle['dashOffset'];
  /** 描边端点线帽 */
  lineCap?: IRPatternLineStyle['lineCap'];
  /** 描边拐角连接 */
  lineJoin?: IRPatternLineStyle['lineJoin'];
};

/** Pattern definition 消费的完整线条样式周期 */
export type ResolvedPatternLineStyleCycle = {
  /** 一个周期包含的相邻线条数量 */
  period: number;
  /** 按零基 index 展开的完整样式数组 */
  styles: ReadonlyArray<ResolvedPatternLineStyle>;
};

/**
 * pattern emit 的运行时上下文
 * @description 提供基础尺寸、基础样式、可选方向/周期样式和取整函数，供定义生成 motif 几何
 */
export type PatternEmitContext = {
  /** 解析后的基础尺寸或间距（user units）；最终 tile 周期可由 PatternEmitResult.tileSize 覆盖 */
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
  lineWidth?: IRPatternPaintSpec['lineWidth'];
  /** 解析后的描边 dash pattern；已应用显式值与 dashed / dotted 预设优先级 */
  dashPattern?: IRPatternPaintSpec['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPatternPaintSpec['dashOffset'];
  /** 描边端点线帽 */
  lineCap?: IRPatternPaintSpec['lineCap'];
  /** 描边拐角连接 */
  lineJoin?: IRPatternPaintSpec['lineJoin'];
  /** 已继承基础字段并解析 preset 的横向线条样式 */
  horizontalStyle?: ResolvedPatternLineStyle;
  /** 已继承基础字段并解析 preset 的纵向线条样式 */
  verticalStyle?: ResolvedPatternLineStyle;
  /** 已按 index 展开并解析继承关系的线条样式周期 */
  lineStyleCycle?: ResolvedPatternLineStyleCycle;
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (n: number) => number;
};

/**
 * Pattern definition 的扩展 tile 输出
 * @description 用于 motif 周期不同于 `context.size` 的图案；编译器校验并写入最终 Scene tile
 */
export type PatternEmitResult = {
  /** 最终 tile 周期（user units），必须为 finite 正数 */
  tileSize: number;
  /** 局部 tile 坐标中的 motif 几何 */
  motif: Iterable<MarkerPrimitive>;
};

/** Pattern definition 可返回默认周期的 motif iterable，或显式 tile 周期结果 */
export type PatternEmitOutput = Iterable<MarkerPrimitive> | PatternEmitResult;

/**
 * 可注册的 pattern 定义
 * @description 描述默认基础尺寸和 motif 几何生成能力；定义本身不进入 IR
 */
export type PatternDefinition = {
  /** pattern 名称，由 IR pattern paint 的 `shape` 引用 */
  name: string;
  /**
   * `pattern.size` 省略时的基础尺寸（user units）；最终 tile 周期可由 emit 结果改写
   * @default 8
   */
  defaultSize?: number;
  /** 局部 tile 坐标中的 motif 几何 */
  emit: (ctx: PatternEmitContext) => PatternEmitOutput;
};
