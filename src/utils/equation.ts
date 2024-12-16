import { line } from 'd3-shape';
import { Point } from '../types/tikz.type';

/** 直线方程 */
export const calculateLinearEquation = (points: [Point, Point], axis: 'x' | 'y' = 'x') => {
  const [x1, y1] = points[0];
  const [x2, y2] = points[1];

  if (x1 === x2) {
    throw new Error("Line equation can't be a vertical line");
  }

  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;

  return axis === 'x' ? (x: number) => m * x + b : (y: number) => (y - b) / m;
};

export const getLinePath = (points: Array<[number, number]>) => {
  const straightLine = line().x(d => d[0]).y(d => d[1])
  return straightLine(points);
}