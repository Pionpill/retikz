import type {
  ArrowShapeValue,
  BlendModeValue,
  IRAnimationTrack,
  IRGraphicStyle,
  IRJsonObject,
  IRPathBase,
  IRPosition,
  PathFillRuleValue,
  PathLineCapValue,
  PathLineJoinValue,
  ResolvedDropShadow,
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
 * @description 坐标 / 角度均使用 user units；角度单位为度，0 指向 +x，正方向为顺时针。
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
 * 端点级已解析的箭头 marker 描述。
 * @description 包含 marker 内部几何与定位尺寸；纯 JSON 数据，无函数或注册表依赖。
 */
export type ResolvedArrowEndSpec = {
  /** 形状名：内置或经 `CompileOptions.arrows` 注册的扩展名，供标识 / 调试使用。 */
  shape: ArrowShapeValue;
  /** marker 局部坐标系的基准边长。 */
  baseSize: number;
  /** 线接触点。 */
  refX: number;
  /** 已解析箭头长度。 */
  markerWidth: number;
  /** 已解析箭头宽度。 */
  markerHeight: number;
  /**
   * marker 元素级不透明度 0..1；缺省继承 path opacity
   * @default 继承 `path.opacity`
   */
  opacity?: number;
  /** 局部 baseSize 坐标系下的内部几何。 */
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
  strokeOpacity?: IRGraphicStyle['strokeOpacity'];
  /** 描边宽度 */
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  /** 描边 dash pattern */
  dashPattern?: IRPathBase['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPathBase['dashOffset'];
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
