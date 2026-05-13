import type { ArrowShape } from '../ir/path/arrow';

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
 * 端点级解析后的箭头视觉规格（Scene primitive 层）
 * @description compile/path.ts 把 IR `arrowDetail` 顶层 + start/end merge 后产出此结构。`shape` 必填、其余视觉字段全 optional：缺省字段交给 renderer 走 context-stroke / 硬编码 fallback，保持向后兼容
 */
export type ArrowEndSpec = {
  /** 形状名 */
  shape: ArrowShape;
  /** 等比缩放因子（乘到 length/width 上）；缺省 1 */
  scale?: number;
  /** 尖长（user units）；缺省让 renderer 走默认 6 */
  length?: number;
  /** 尖宽（user units）；缺省让 renderer 走默认 6 */
  width?: number;
  /** 描边颜色 override；缺省走 context-stroke（继承 path stroke） */
  color?: string;
  /** 填充色 override（仅实心 shape 生效；空心 shape 已在 compile 阶段被丢） */
  fill?: string;
  /** 箭头不透明度 0..1；缺省继承 path opacity */
  opacity?: number;
  /** 空心 shape 描边粗细（user units）；缺省 1.5。实心 shape 忽略 */
  lineWidth?: number;
};

/** 路径原语：结构化 commands 数组；adapter 在 render 时翻译为各自原生 API */
export type PathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** 结构化路径命令序列，按数组顺序绘制 */
  commands: Array<PathCommand>;
  /** 填充色；不填表示不填充 */
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** SVG fill-rule：`nonzero`（默认）/ `evenodd`（环形 / 孔洞场景） */
  fillRule?: 'nonzero' | 'evenodd';
  /** 描边色 */
  stroke?: string;
  /** 描边透明度 0~1（SVG stroke-opacity） */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 模式 */
  strokeDasharray?: string;
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
