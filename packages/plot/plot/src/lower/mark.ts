import type { IRChild, IRNode, IRPath, IRStep } from '@retikz/core';
import type { ExternalRow, Mark } from '../ir';
import { compareByPath } from './field';
import type { Projector } from './project';

/** 散点 glyph 默认直径（user units，已补偿 circle 外接） */
const POINT_SIZE = 10;
/** 折线默认描边宽度（user units） */
const LINE_STROKE_WIDTH = 2;

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
        // padding 0：否则默认 padding(8) 撑大盒子、minimumSize 被盖过失效
        padding: 0,
        // circle 外接正方盒（直径 = 盒边 × √2），除以 √2 让 POINT_SIZE 即真实直径
        minimumSize: POINT_SIZE / Math.SQRT2,
        fill: 'currentColor',
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
  const path: IRPath = { type: 'path', stroke: 'currentColor', strokeWidth: LINE_STROKE_WIDTH, children: steps };
  return [path];
};
