import type { IRAnimationTrack } from '../../schemas';
import type { BlendModeValue, ResolvedDropShadow } from '../../schemas';
import type { IRJsonObject } from '../../schemas';
import type { ArrowShapeValue } from '../../schemas';
import type {
  IRGraphicStyle,
  IRPathBase,
  IRPosition,
  PathFillRuleValue,
  PathLineCapValue,
  PathLineJoinValue,
} from '../../schemas';
import type { MarkerPrimitive } from './marker';
import type { PaintValue } from './paint';

/** 移动命令：移动游标到目标点，不绘制。 */
export type MovePathCommand = {
  /** 命令判别符。 */
  kind: 'move';
  /** 移动目标点。 */
  to: IRPosition;
};

/** 直线命令：从游标到目标点画直线。 */
export type LinePathCommand = {
  /** 命令判别符。 */
  kind: 'line';
  /** 直线目标点。 */
  to: IRPosition;
};

/** 二次贝塞尔命令：使用一个控制点连接到目标点。 */
export type QuadPathCommand = {
  /** 命令判别符。 */
  kind: 'quad';
  /** 二次贝塞尔控制点。 */
  control: IRPosition;
  /** 曲线目标点。 */
  to: IRPosition;
};

/** 三次贝塞尔命令：使用两个控制点连接到目标点。 */
export type CubicPathCommand = {
  /** 命令判别符。 */
  kind: 'cubic';
  /** 第一个三次贝塞尔控制点。 */
  control1: IRPosition;
  /** 第二个三次贝塞尔控制点。 */
  control2: IRPosition;
  /** 曲线目标点。 */
  to: IRPosition;
};

/** 圆弧命令：以 center 为圆心、给定半径与起末角度的圆弧。 */
export type ArcPathCommand = {
  /** 命令判别符。 */
  kind: 'arc';
  /** 圆弧圆心。 */
  center: IRPosition;
  /** 圆弧半径。 */
  radius: number;
  /** 起始角度，单位为度。 */
  startAngle: number;
  /** 结束角度，单位为度。 */
  endAngle: number;
  /**
   * 是否逆时针绘制。
   * @default false
   */
  counterClockwise?: boolean;
};

/** 椭圆弧命令：以 center 为圆心、给定 x/y 半径与起末角度的椭圆弧。 */
export type EllipseArcPathCommand = {
  /** 命令判别符。 */
  kind: 'ellipseArc';
  /** 椭圆弧圆心。 */
  center: IRPosition;
  /** x 轴半径。 */
  radiusX: number;
  /** y 轴半径。 */
  radiusY: number;
  /**
   * 椭圆旋转角度，单位为度。
   * @default 0
   */
  rotation?: number;
  /** 起始角度，单位为度。 */
  startAngle: number;
  /** 结束角度，单位为度。 */
  endAngle: number;
  /**
   * 是否逆时针绘制。
   * @default false
   */
  counterClockwise?: boolean;
};

/** 闭合命令：闭合当前子路径回最近一次 move 起点。 */
export type ClosePathCommand = {
  /** 命令判别符。 */
  kind: 'close';
};

/**
 * Path 命令：结构化路径绘制操作（7 分支 discriminated union）
 * @description discriminated union 按 kind 分发；坐标 / 角度均使用 user units（角度=度，0=+x、90=+y/视觉下、CW=正）。各 adapter 自行翻译为原生 API：SVG 拼 `d` 字符串、Canvas 调 ctx.moveTo/lineTo/arc 等。每个 kind 有对应 named type export，便于 wrapper / `Pick<>` 派生。
 */
export type PathCommand =
  | MovePathCommand
  | LinePathCommand
  | QuadPathCommand
  | CubicPathCommand
  | ArcPathCommand
  | EllipseArcPathCommand
  | ClosePathCommand;

/**
 * 端点级已解析的箭头 marker 描述（Scene primitive 层，renderer-agnostic）
 * @description compile 把 IR `arrowDetail` 顶层 + start/end merge、查 effective arrow 表、调 `def.emit`
 *   产几何，所有视觉输入（scale / length / width / color / fill / lineWidth）在 compile 解析阶段被消费、
 *   **不**出现在本结构里。最终挂在 `PathPrim.arrowStart` / `arrowEnd` 上的是"已解析 marker 描述"：内部几何
 *   `marker`（`MarkerPrimitive[]`，局部 baseSize 坐标系）+ wrapper 参数（`baseSize` / `refX` / `markerWidth` /
 *   `markerHeight` / `opacity`）。adapter 只**物化**——把 `marker` 嵌进 `<marker viewBox refX refY markerWidth
 *   markerHeight>`，不再 switch、不调 emit、不需要 arrows 注册表。纯 JSON 数据（无函数）。
 */
export type ResolvedArrowEndSpec = {
  /** 形状名：内置 8 或经 `CompileOptions.arrows` 注册的扩展名；标识 / 调试用，已解析后渲染不依赖（保留） */
  shape: ArrowShapeValue;
  /** marker viewBox 边长（`def.baseSize ?? 10`）；adapter 据此推 viewBox `0 0 baseSize baseSize` 与 refY = baseSize/2 */
  baseSize: number;
  /** 线接触点（marker refX）；hollow 已在 compile 解析阶段减 lineWidth/2（adapter 不再算） */
  refX: number;
  /** 已解析尖长 = `(length ?? def.defaultLength) * scale`（adapter 直接当 markerWidth 用） */
  markerWidth: number;
  /** 已解析尖宽 = `(width ?? def.defaultWidth) * scale`（adapter 直接当 markerHeight 用） */
  markerHeight: number;
  /**
   * marker 元素级不透明度 0..1；缺省继承 path opacity
   * @default 继承 `path.opacity`
   */
  opacity?: number;
  /** `def.emit` 产物：局部 baseSize 坐标系下的内部几何（fill 限 `string | { kind:'contextStroke' }`） */
  marker: Array<MarkerPrimitive>;
};

/** 路径原语：结构化 commands 数组；adapter 在 render 时翻译为各自原生 API */
export type PathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** provenance 元数据：compile 从 IR 元素（node / path / scope）的 `meta` 原样 stamp，renderer 忽略（不进 DOM），交互层 / 工具链从 Scene 读 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks：compile 从 IR 元素的 animations 原样 stamp；renderer 能播则播、不能则渲染 settled 静态态并 warn（不丢图） */
  animations?: Array<IRAnimationTrack>;
  /** 结构化路径命令序列，按数组顺序绘制 */
  commands: Array<PathCommand>;
  /** 填充：纯色 / 资源表 paint server（gradient）/ contextStroke；不填表示不填充 */
  fill?: PaintValue;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: IRGraphicStyle['fillOpacity'];
  /**
   * 填充规则：`nonzero`（默认）/ `evenodd`（环形 / 孔洞场景）
   * @default 'nonzero'
   */
  fillRule?: PathFillRuleValue;
  /** 描边：纯色 / 资源表 paint server（gradient）/ contextStroke */
  stroke?: PaintValue;
  /**
   * 描边透明度 0~1
   * @default 1
   */
  strokeOpacity?: IRGraphicStyle['drawOpacity'];
  /** 描边宽度 */
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  /** 描边 dash pattern */
  dashPattern?: IRPathBase['dashPattern'];
  /**
   * 端点形状
   * @default 'butt'
   */
  strokeLinecap?: PathLineCapValue;
  /**
   * 拐点形状
   * @default 'miter'
   */
  strokeLinejoin?: PathLineJoinValue;
  /** 起点箭头视觉规格；undefined = 无箭头 */
  arrowStart?: ResolvedArrowEndSpec;
  /** 终点箭头视觉规格；undefined = 无箭头 */
  arrowEnd?: ResolvedArrowEndSpec;
  /**
   * 整体透明度 0~1
   * @default 1
   */
  opacity?: IRGraphicStyle['opacity'];
  /** 投影：解析后对象（preset 已展开 + 显式覆盖合并）；undefined = 无投影 */
  shadow?: ResolvedDropShadow;
  /**
   * 混合模式：解析后值；undefined / normal = 普通 source-over
   * @default 'normal'
   */
  blendMode?: BlendModeValue;
};
