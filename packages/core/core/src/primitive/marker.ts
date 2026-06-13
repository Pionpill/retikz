import type { Transform } from './group';

/**
 * marker-local 填充取值
 * @description ArrowDefinition.emit 产物的 fill 收窄子集——只允许 `string`（纯色 CSS）或
 *   `{ kind: 'contextStroke' }`（继承所在元素描边，主题反应）；不含 `{ kind: 'resourceRef' }`
 *   （marker 内禁外部 paint server 引用，杜绝跨 `<defs>` 资源耦合）。
 */
export type MarkerFill = string | { kind: 'contextStroke' };

/**
 * marker-local path 原语：`PathPrim` 去掉 arrowStart / arrowEnd（禁递归箭头），fill 收窄到 `MarkerFill`
 * @description 局部 baseSize 坐标系（viewBox `0 0 baseSize baseSize`）；adapter 把它嵌进 `<marker>`。
 *   不含外部 resourceRef / clip / text。
 */
export type MarkerPathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** 结构化路径命令序列（复用 Scene PathCommand 词汇） */
  commands: Array<MarkerPathCommand>;
  /** 填充：纯色 / contextStroke；不填表示不填充 */
  fill?: MarkerFill;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 填充规则：`nonzero`（默认）/ `evenodd`（环形 / 孔洞场景） */
  fillRule?: 'nonzero' | 'evenodd';
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }`（继承所在元素描边）；与 fill 同词汇，core 不持 SVG 裸关键字 */
  stroke?: MarkerFill;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  /** 描边宽度（marker 局部坐标） */
  strokeWidth?: number;
  /** 描边 dash pattern */
  dashPattern?: Array<number>;
  /** 端点形状 */
  strokeLinecap?: 'butt' | 'round' | 'square';
  /** 拐点形状 */
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
};

/**
 * marker-local path 命令
 * @description 与 Scene 的 `PathCommand` 同词汇（move/line/quad/cubic/arc/ellipseArc/close）；
 *   独立别名命名，让 marker 子集与 Scene 词汇解耦演化。坐标在 marker 局部 baseSize 系。
 */
export type MarkerPathCommand =
  | { kind: 'move'; to: [number, number] }
  | { kind: 'line'; to: [number, number] }
  | { kind: 'quad'; control: [number, number]; to: [number, number] }
  | {
      kind: 'cubic';
      control1: [number, number];
      control2: [number, number];
      to: [number, number];
    }
  | {
      kind: 'arc';
      center: [number, number];
      radius: number;
      startAngle: number;
      endAngle: number;
      counterClockwise?: boolean;
    }
  | {
      kind: 'ellipseArc';
      center: [number, number];
      radiusX: number;
      radiusY: number;
      rotation?: number;
      startAngle: number;
      endAngle: number;
      counterClockwise?: boolean;
    }
  | { kind: 'close' };

/**
 * marker-local ellipse 原语：`EllipsePrim` fill 收窄到 `MarkerFill`
 * @description 圆形（rx=ry）复用同一 prim；不含外部 resourceRef。
 */
export type MarkerEllipsePrim = {
  /** 类型判别符 */
  type: 'ellipse';
  /** 圆心 x（marker 局部坐标） */
  cx: number;
  /** 圆心 y */
  cy: number;
  /** x 轴半径 */
  rx: number;
  /** y 轴半径 */
  ry: number;
  /** 绕中心旋转度数 */
  rotate?: number;
  /** 填充：纯色 / contextStroke */
  fill?: MarkerFill;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }` */
  stroke?: MarkerFill;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边 dash pattern */
  dashPattern?: Array<number>;
};

/**
 * marker-local rect 原语：`RectPrim` fill 收窄到 `MarkerFill`
 * @description 不含外部 resourceRef；`x`/`y` 维持 RectPrim 的左上角约定。
 */
export type MarkerRectPrim = {
  /** 类型判别符 */
  type: 'rect';
  /** 左上角横坐标（marker 局部坐标） */
  x: number;
  /** 左上角纵坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
  /** 填充：纯色 / contextStroke */
  fill?: MarkerFill;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }` */
  stroke?: MarkerFill;
  /** 描边透明度 0~1 */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边 dash pattern */
  dashPattern?: Array<number>;
  /** 圆角半径（同时作用于 rx/ry） */
  cornerRadius?: number;
};

/**
 * marker-local group 原语：允许 transform 包裹的复合箭头
 * @description children 只能再套 `MarkerPrimitive`（path / ellipse / rect / group），
 *   禁再套 marker / text；杜绝 marker 递归引用。
 */
export type MarkerGroupPrim = {
  /** 类型判别符 */
  type: 'group';
  /** 结构化变换序列，按数组顺序应用；undefined / 空数组表示无变换 */
  transforms?: Array<Transform>;
  /** 组内子原语（仅 MarkerPrimitive 子集，禁 text / 嵌套 marker） */
  children: Array<MarkerPrimitive>;
};

/**
 * marker 物化窄子集：ArrowDefinition.emit 的产物类型
 * @description renderer-agnostic：core 只产此结构（局部 baseSize 坐标系），react adapter 把它嵌进
 *   `<marker>`。相对 `ScenePrimitive` 的收窄——禁 `TextPrim`、禁 `arrowStart`/`arrowEnd`、禁外部
 *   `resourceRef`、禁 `clip`；`fill` 限 `MarkerFill`。这条收窄兜住"marker 内递归引用 marker / clip /
 *   文本布局"的复杂度。
 */
export type MarkerPrimitive =
  | MarkerPathPrim
  | MarkerEllipsePrim
  | MarkerRectPrim
  | MarkerGroupPrim;
