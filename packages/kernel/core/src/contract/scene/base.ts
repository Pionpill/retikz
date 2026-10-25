import type { JsonObject } from '@retikz/foundation';

import type {
  BlendMode,
  IRAnimationTrack,
  IRGraphicStyle,
  IRPathBase,
  PathLineCap,
  PathLineJoin,
  ResolvedDropShadow,
} from '../../schemas';
import type { PaintValue } from './paint';

/** 图元标识、元数据、动画与命中属性 */
export type ScenePrimitiveBase = {
  /** 禁用该图元及其子树的指针命中；省略时保持正常命中 */
  pointerEvents?: 'none';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** provenance 元数据：compile 从 IR 元素（node / path / scope）的 `meta` 原样 stamp，renderer 忽略（不进 DOM），交互层 / 工具链从 Scene 读 */
  meta?: JsonObject;
  /** 时间轴动画 tracks：compile 从 IR 元素的 animations 原样 stamp；renderer 能播则播、不能则渲染 settled 静态态并 warn（不丢图） */
  animations?: Array<IRAnimationTrack>;
};

/** 图元填充样式 */
export type ScenePrimitiveFill = {
  /** 填充：纯色 / 资源表 paint server（gradient）/ contextStroke；不填表示不填充 */
  fill?: PaintValue;
};

/** 图元描边样式 */
export type ScenePrimitiveStroke = {
  /** 描边：纯色 / 资源表 paint server（gradient）/ contextStroke */
  stroke?: PaintValue;
  /** 描边宽度 */
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  /** 描边 dash pattern */
  dashPattern?: NonNullable<IRPathBase['style']>['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: NonNullable<IRPathBase['style']>['dashOffset'];
  /**
   * 端点形状
   * @default 'butt'
   */
  lineCap?: PathLineCap;
  /**
   * 拐点形状
   * @default 'miter'
   */
  lineJoin?: PathLineJoin;
};

/** 图元投影与混合效果 */
export type ScenePrimitiveEffects = {
  /** 投影：解析后对象（preset 已展开 + 显式覆盖合并）；undefined = 无投影 */
  shadow?: ResolvedDropShadow;
  /**
   * 混合模式：解析后值；undefined / normal = 普通 source-over
   * @default 'normal'
   */
  blendMode?: BlendMode;
};

/** 图元整体、填充与描边的透明度 */
export type ScenePrimitiveOpacity = {
  /**
   * 整体透明度 0~1
   * @default 1
   */
  opacity?: number;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: number;
  /**
   * 描边透明度 0~1
   * @default 1
   */
  strokeOpacity?: number;
};
