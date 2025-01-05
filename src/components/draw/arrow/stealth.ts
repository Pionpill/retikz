import { line } from 'd3-shape';
import { Position } from '../../../types/coordinate/descartes';
import { ArrowPositionAttributes } from './types';

const getStealthPath = (attributes: ArrowPositionAttributes) => {
  const {
    width = 7,
    length = 8,
    insert = 3,
    left = false,
    right = false,
    scale = 1,
    lineWidth = 1,
    strokeLinejoin = 'miter',
  } = attributes;

  const startPoint: Position = [0, 0];
  const leftPoint: Position = [-length * scale, (-width / 2) * scale];
  const insertPoint: Position = [-length * scale + insert, 0];
  const rightPoint: Position = [-length * scale, (width / 2) * scale];

  const way = left
    ? [startPoint, leftPoint, insertPoint]
    : right
    ? [startPoint, rightPoint, insertPoint]
    : [startPoint, leftPoint, insertPoint, rightPoint];

  const straightLine = line()
    .x(d => d[0])
    .y(d => d[1]);

  const radio = width / 2 / Math.sqrt(length ** 2 + (width / 2) ** 2);

  return {
    d: straightLine(way) + 'Z',
    pathLinkPoint: insertPoint,
    offsetDistance: strokeLinejoin === 'round' ? lineWidth : lineWidth / radio,
    insertDistance: length - insert,
  };
};

export default getStealthPath;
