import { PointPosition } from '../../types/coordinate';
import { DrawPointType } from './types';

const offsetReg = /\+[[(]?[+-]?\d+(?:\.\d+)?,\s*[+-]?\d+(?:\.\d+)?[)\]]?/;
const moveReg = /\+\+[[(]?[+-]?\d+(?:\.\d+)?,\s*[+-]?\d+(?:\.\d+)?[)\]]?/;

/** 获取点类型 */
export const getDrawPointType = (point: string | PointPosition): DrawPointType => {
  if (typeof point !== 'string') return 'coordinate';
  if (['-|', '|-', '-|-', '|-|'].includes(point)) return 'vertical';
  if (point.match(moveReg)) return 'move';
  if (point.match(offsetReg)) return 'offset';
  return 'node';
};
