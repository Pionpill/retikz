import type { IRChild, IRNode, IRPath, IRStep } from '@retikz/core';
import type { ExternalRow, Mark } from '../ir';
import { compareByPath } from './field';
import type { Projector } from './project';

/** 散点 glyph 默认直径（minimumSize，user units） */
const POINT_SIZE = 6;

/**
 * 把一个 mark + 数据行下沉成 core 图元
 * @description point → 每行一个 circle Node；line → 一条 Path（move + line steps，按 order 连点；少于 2 点不成线）
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, project: Projector): Array<IRChild> => {
  if (mark.type === 'point') {
    const out: Array<IRChild> = [];
    for (const row of rows) {
      const point = project(mark, row);
      if (!point) continue;
      const dot: IRNode = {
        type: 'node',
        shape: 'circle',
        position: point,
        minimumSize: POINT_SIZE,
        fill: 'black',
        stroke: 'black',
      };
      out.push(dot);
    }
    return out;
  }

  const ordered = mark.order
    ? [...rows].sort((a, b) => compareByPath(a, b, mark.order as string))
    : rows;
  const points = ordered
    .map(row => project(mark, row))
    .filter((point): point is [number, number] => point !== null);
  if (points.length < 2) return [];
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  const path: IRPath = { type: 'path', stroke: 'black', strokeWidth: 1, children: steps };
  return [path];
};
