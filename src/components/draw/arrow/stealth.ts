import { line } from 'd3-shape';
import { Position } from '../../../types/coordinate/descartes';
import { ArrowAttributes } from './types';

const getStealthPath = (attributes: ArrowAttributes) => {
  const {
    width = 4,
    length = 5,
    insert = 1.75,
    left = false,
    right = false,
    scale = 1,
    strokeWidth = 1,
    round,
    strokeLinejoin = 'miter',
  } = attributes;

  const startPoint: Position = [0, 0];
  const leftPoint: Position = [-length * scale, (-width / 2) * scale];
  const insertPoint: Position = [(-length + insert) * scale, 0];
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
    offsetDistance: round || strokeLinejoin === 'round' ? strokeWidth / 2 : strokeWidth / (2 * radio),
    insertDistance: length - insert,
  };
};

export default getStealthPath;
