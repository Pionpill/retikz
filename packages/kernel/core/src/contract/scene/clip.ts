import type {
  IRCircleClipSpec,
  IRClipFillRule,
  IRCompoundClipSpec,
  IREllipseClipSpec,
  IRPathClipSpec,
  IRPolygonClipSpec,
  IRRectClipSpec,
} from '../../schemas';
import type { PathCommand } from './path';

/** 用户坐标系中的矩形 Scene 裁剪形状。 */
export type RectClipShape = IRRectClipSpec;

/** 用户坐标系中的圆形 Scene 裁剪形状。 */
export type CircleClipShape = IRCircleClipSpec;

/** 用户坐标系中的椭圆 Scene 裁剪形状。 */
export type EllipseClipShape = IREllipseClipSpec;

/** 用户坐标系中的多边形 Scene 裁剪形状。 */
export type PolygonClipShape = IRPolygonClipSpec;

/** 使用结构化路径命令描述的 Scene 裁剪形状。 */
export type PathClipShape = Omit<IRPathClipSpec, 'commands' | 'fillRule'> & {
  commands: Array<PathCommand>;
  /**
   * 裁剪路径填充规则。
   * @default 'nonzero'
   */
  fillRule?: IRClipFillRule;
};

/** 由嵌套裁剪形状组合而成的复合 Scene 裁剪形状。 */
export type CompoundClipShape = Omit<IRCompoundClipSpec, 'children' | 'fillRule'> & {
  children: Array<ClipShape>;
  /**
   * 复合裁剪形状填充规则。
   * @default 'nonzero'
   */
  fillRule?: IRClipFillRule;
};

/** renderer adapter 消费的 Scene 裁剪形状联合类型。 */
export type ClipShape =
  | RectClipShape
  | CircleClipShape
  | EllipseClipShape
  | PolygonClipShape
  | PathClipShape
  | CompoundClipShape;

/** 可被 primitive 或 group 引用的具名 Scene 裁剪资源。 */
export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};
