import type { JsonObject } from '@retikz/foundation';

import type { BlendMode, IRAnimationTrack, IRGraphicStyle, IRPathBase, ResolvedDropShadow } from '../../schemas';
import type { PaintValue } from './paint';

/** 椭圆原语，圆形复用 rx=ry 的同一 Scene 分支 */
export type EllipsePrim = {
  /** 标识椭圆场景图元 */
  type: 'ellipse';
  /** 禁用该图元及其子树的指针命中；省略时保持正常命中 */
  hitTest?: false;
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** provenance 元数据：compile 从 IR 元素（node / path / scope）的 `meta` 原样 stamp，renderer 忽略（不进 DOM），交互层 / 工具链从 Scene 读 */
  meta?: JsonObject;
  /** 时间轴动画 tracks：compile 从 IR 元素的 animations 原样 stamp；renderer 能播则播、不能则渲染 settled 静态态并 warn（不丢图） */
  animations?: Array<IRAnimationTrack>;
  /** 椭圆中心的局部 x 坐标 */
  cx: number;
  /** 椭圆中心的局部 y 坐标 */
  cy: number;
  /** 椭圆水平半轴长度 */
  rx: number;
  /** 椭圆垂直半轴长度 */
  ry: number;
  /**
   * 绕中心旋转度数
   * @default 0
   */
  rotate?: number;
  /** 填充：纯色 / 资源表 paint server（gradient）/ contextStroke */
  fill?: PaintValue;
  /**
   * 填充透明度 0~1
   * @default 1
   */
  fillOpacity?: IRGraphicStyle['fillOpacity'];
  /** 描边：纯色 / 资源表 paint server（gradient）/ contextStroke */
  stroke?: PaintValue;
  /**
   * 描边透明度 0~1
   * @default 1
   */
  strokeOpacity?: IRGraphicStyle['strokeOpacity'];
  /** 描边宽度，采用场景坐标单位 */
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  /** 沿椭圆边界重复的虚线段与间隙序列 */
  dashPattern?: NonNullable<IRPathBase['style']>['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: NonNullable<IRPathBase['style']>['dashOffset'];
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
  blendMode?: BlendMode;
};
