import type { ArrowShapeName } from '../ir/path/arrow';
import type { IRJsonObject } from '../ir/json';
import type { MarkerPrimitive } from './marker';
import type { PaintValue } from './paint';

/** Move command：移动游标到目标点，不绘制 */
export type MovePathCommand = {
  /** 鉴别字面量 */
  kind: 'move';
  /** 目标点 [x, y] */
  to: [number, number];
};

/** Line command：从游标到目标点画直线 */
export type LinePathCommand = {
  /** 鉴别字面量 */
  kind: 'line';
  /** 终点 [x, y] */
  to: [number, number];
};

/** Quad command：二次贝塞尔，一个控制点 */
export type QuadPathCommand = {
  /** 鉴别字面量 */
  kind: 'quad';
  /** 控制点 [x, y] */
  control: [number, number];
  /** 终点 [x, y] */
  to: [number, number];
};

/** Cubic command：三次贝塞尔，两个控制点 */
export type CubicPathCommand = {
  /** 鉴别字面量 */
  kind: 'cubic';
  /** 第一控制点 [x, y]（影响起点切线） */
  control1: [number, number];
  /** 第二控制点 [x, y]（影响终点切线） */
  control2: [number, number];
  /** 终点 [x, y] */
  to: [number, number];
};

/** Arc command：以 center 为圆心、给定半径与起末角度的圆弧（center-parameterization） */
export type ArcPathCommand = {
  /** 鉴别字面量 */
  kind: 'arc';
  /** 圆心 [x, y] */
  center: [number, number];
  /** 半径（user units） */
  radius: number;
  /** 起始角度（度，0° = +x、90° = +y screen-down） */
  startAngle: number;
  /** 终止角度（度） */
  endAngle: number;
  /** 是否逆时针扫描；缺省 / `false` = CW（屏幕坐标系正向） */
  counterClockwise?: boolean;
};

/** EllipseArc command：以 center 为圆心、给定 x/y 半径与起末角度的椭圆弧；可选 rotation */
export type EllipseArcPathCommand = {
  /** 鉴别字面量 */
  kind: 'ellipseArc';
  /** 圆心 [x, y] */
  center: [number, number];
  /** x 轴半径 */
  radiusX: number;
  /** y 轴半径 */
  radiusY: number;
  /** 椭圆整体旋转角度（度），缺省 0 */
  rotation?: number;
  /** 起始角度（度） */
  startAngle: number;
  /** 终止角度（度） */
  endAngle: number;
  /** 是否逆时针扫描；缺省 / `false` = CW */
  counterClockwise?: boolean;
};

/** Close command：闭合当前子路径回最近一次 move 起点 */
export type ClosePathCommand = {
  /** 鉴别字面量；无其他字段 */
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
export type ArrowEndSpec = {
  /** 形状名：内置 7 或经 `CompileOptions.arrows` 注册的扩展名；标识 / 调试用，已解析后渲染不依赖（保留） */
  shape: ArrowShapeName;
  /** marker viewBox 边长（`def.baseSize ?? 10`）；adapter 据此推 viewBox `0 0 baseSize baseSize` 与 refY = baseSize/2 */
  baseSize: number;
  /** 线接触点（marker refX）；hollow 已在 compile 解析阶段减 lineWidth/2（adapter 不再算） */
  refX: number;
  /** 已解析尖长 = `(length ?? def.defaultLength) * scale`（adapter 直接当 markerWidth 用） */
  markerWidth: number;
  /** 已解析尖宽 = `(width ?? def.defaultWidth) * scale`（adapter 直接当 markerHeight 用） */
  markerHeight: number;
  /** marker 元素级不透明度 0..1；缺省继承 path opacity */
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
  /** 结构化路径命令序列，按数组顺序绘制 */
  commands: Array<PathCommand>;
  /** 填充：纯色 / 资源表 paint server（gradient）/ contextStroke；不填表示不填充 */
  fill?: PaintValue;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 填充规则：`nonzero`（默认）/ `evenodd`（环形 / 孔洞场景） */
  fillRule?: 'nonzero' | 'evenodd';
  /** 描边色 */
  stroke?: string;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边 dash pattern */
  dashPattern?: Array<number>;
  /** 端点形状 */
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** 拐点形状 */
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  /** 起点箭头视觉规格；undefined = 无箭头 */
  arrowStart?: ArrowEndSpec;
  /** 终点箭头视觉规格；undefined = 无箭头 */
  arrowEnd?: ArrowEndSpec;
  /** 整体透明度 0~1 */
  opacity?: number;
};
