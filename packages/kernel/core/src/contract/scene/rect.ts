import type {
  BlendModeValue,
  IRAnimationTrack,
  IRGraphicStyle,
  IRJsonObject,
  IRNode,
  IRPathBase,
  ResolvedDropShadow,
} from '../../schemas';
import type { PaintValue } from './paint';

/** 矩形原语 */
export type RectPrim = {
  /** 类型判别符 */
  type: 'rect';
  /** 稳定挂点 id：compile 从 IR 元素 user id stamp，供 renderer emit data-retikz-id / canvas hit-test */
  id?: string;
  /** provenance 元数据：compile 从 IR 元素（node / path / scope）的 `meta` 原样 stamp，renderer 忽略（不进 DOM），交互层 / 工具链从 Scene 读 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks：compile 从 IR 元素的 animations 原样 stamp；renderer 能播则播、不能则渲染 settled 静态态并 warn（不丢图） */
  animations?: Array<IRAnimationTrack>;
  /** 左上角横坐标 */
  x: number;
  /** 左上角纵坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
  /** 填充：纯色 CSS 串、或指向资源表的 paint server（gradient）、或 contextStroke */
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
  /** 描边宽度 */
  strokeWidth?: IRGraphicStyle['strokeWidth'];
  /** 描边 dash pattern（如 [4, 2]） */
  dashPattern?: IRPathBase['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRPathBase['dashOffset'];
  /**
   * 圆角半径（同时作用于 rx/ry）
   * @default 0
   */
  cornerRadius?: IRNode['cornerRadius'];
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
