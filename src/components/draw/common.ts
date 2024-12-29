import { PointPosition } from "../../types/coordinate";

/** 垂直路径点，临近的节点不能都是特殊路径点 */
export type VerticalDrawPosition = '-|' | '|-';
export type OffSetOrMovePosition = string;
/** 路径点类型：节点，坐标，垂点，偏移点，移动点 */
export type DrawPointType = 'node' | 'coordinate' | 'vertical' | 'offset' | 'move';

const offsetReg = /\+[[(]?[+-]?\d+(?:\.\d+)?,\s*[+-]?\d+(?:\.\d+)?[)\]]?/;
const moveReg = /\+\+[[(]?[+-]?\d+(?:\.\d+)?,\s*[+-]?\d+(?:\.\d+)?[)\]]?/;

/** 获取点类型 */
export const getDrawPointType = (point: string | PointPosition): DrawPointType => {
    if (typeof point !== 'string') return 'coordinate';
    if (['-|', '|-'].includes(point)) return 'vertical';
    if (point.match(moveReg)) return 'move';
    if (point.match(offsetReg)) return 'offset';
    return 'node';
  };