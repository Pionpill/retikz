/**
 * 椭圆原语（cx/cy 圆心，rx/ry 半径）
 * @description 圆形（rx=ry）复用同一 prim 单 case 处理；rotate 度数绕中心，非零时由 renderer 在 emit 阶段应用旋转变换
 */
import type { IRAnimationTrack } from '../../schemas';
import type { BlendModeValue, ResolvedDropShadow } from '../../schemas';
import type { IRJsonObject } from '../../schemas';
import type { PaintValue } from './paint';

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
  fillOpacity?: number;
  /** 描边：纯色 / 资源表 paint server（gradient）/ contextStroke */
  stroke?: PaintValue;
  /**
   * 描边透明度 0~1
   * @default 1
   */
  strokeOpacity?: number;
  strokeWidth?: number;
  dashPattern?: Array<number>;
  /**
   * 整体透明度 0~1
   * @default 1
   */
  opacity?: number;
  /** 投影：解析后对象（preset 已展开 + 显式覆盖合并）；undefined = 无投影 */
  shadow?: ResolvedDropShadow;
  /**
   * 混合模式：解析后值；undefined / normal = 普通 source-over
   * @default 'normal'
   */
  blendMode?: BlendModeValue;
};
