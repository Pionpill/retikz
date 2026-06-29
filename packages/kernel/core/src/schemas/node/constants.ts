import { WebSide } from '../../geometry/anchor';
import { AtDirection } from '../position';

/** 节点形状关键字（用 const + ValueOf 派生，不用 TS enum） */
export const BuiltinShape = {
  Rectangle: 'rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Diamond: 'diamond',
} as const;

/** 节点文本对齐（TikZ `align=` 同义） */
export const NodeTextAlign = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const;

/** 节点标签相对节点的位置关键字 */
export const NodeLabelPosition = {
  ...AtDirection,
  Center: 'center',
} as const;

/** 节点标签放置在节点边界内侧或外侧 */
export const NodeLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

/** 节点标签 `{ boundary, t }` 使用的矩形边；compass side 作为输入别名归一到 Web side */
export const NodeLabelBoundarySide = WebSide;
