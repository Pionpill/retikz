import type {
  IRGraphicStyle,
  IRPathBase,
  PathFillRuleValue,
  PathLineCapValue,
  PathLineJoinValue,
} from '../../schemas';
import type { Transform } from './group';
import type { PathCommand } from './path';

/**
 * marker-local 填充取值
 * @description 只允许纯色或 `contextStroke`，不允许引用外部 paint resource。
 */
export type MarkerFill = string | { kind: 'contextStroke' };

/**
 * marker-local path 原语：`PathPrim` 去掉 arrowStart / arrowEnd（禁递归箭头），fill 收窄到 `MarkerFill`
 * @description 局部 baseSize 坐标系；不含外部 resourceRef / clip / text。
 */
export type MarkerPathPrim = {
  /** 类型判别符 */
  type: 'path';
  /** 结构化路径命令序列（复用 Scene PathCommand 词汇） */
  commands: Array<PathCommand>;
  /** 填充：纯色 / contextStroke；不填表示不填充 */
  fill?: MarkerFill;
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
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }`（继承所在元素描边）；与 fill 同词汇，core 不持 SVG 裸关键字 */
  stroke?: MarkerFill;
  /**
   * 描边透明度 0~1
   * @default 1
   */
  strokeOpacity?: IRGraphicStyle['strokeOpacity'];
  /** 描边宽度（marker 局部坐标） */
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
};

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
  /**
   * 绕中心旋转度数
   * @default 0
   */
  rotate?: number;
  /** 填充：纯色 / contextStroke */
  fill?: MarkerFill;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: IRGraphicStyle['fillOpacity'];
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }` */
  stroke?: MarkerFill;
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
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: IRGraphicStyle['fillOpacity'];
  /** 描边色：纯色 CSS 或 `{ kind: 'contextStroke' }` */
  stroke?: MarkerFill;
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
   * 圆角半径（同时作用于 rx/ry）
   * @default 0
   */
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
  /**
   * 结构化变换序列，按数组顺序应用；undefined / 空数组表示无变换
   * @default []
   */
  transforms?: Array<Transform>;
  /** 组内子原语（仅 MarkerPrimitive 子集，禁 text / 嵌套 marker） */
  children: Array<MarkerPrimitive>;
};

/**
 * marker 物化窄子集：ArrowDefinition.emit 的产物类型
 * @description 相对 `ScenePrimitive` 的收窄子集：禁 text、递归箭头、外部 resourceRef 和 clip。
 */
export type MarkerPrimitive = MarkerPathPrim | MarkerEllipsePrim | MarkerRectPrim | MarkerGroupPrim;
