import type {
  BlendModeValue,
  IRAnimationTrack,
  IRGraphicStyle,
  IRJsonObject,
  IRPathBase,
  ResolvedDropShadow,
} from '../../schemas';
import type { PaintValue } from './paint';

/** 椭圆原语，圆形复用 rx=ry 的同一 Scene 分支。 */
export type EllipsePrim = {
  type: 'ellipse';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** provenance 元数据：compile 从 IR 元素（node / path / scope）的 `meta` 原样 stamp，renderer 忽略（不进 DOM），交互层 / 工具链从 Scene 读 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks：compile 从 IR 元素的 animations 原样 stamp；renderer 能播则播、不能则渲染 settled 静态态并 warn（不丢图） */
  animations?: Array<IRAnimationTrack>;
  cx: number;
  cy: number;
  rx: number;
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
  strokeOpacity?: IRGraphicStyle['drawOpacity'];
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  dashPattern?: IRPathBase['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPathBase['dashOffset'];
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
