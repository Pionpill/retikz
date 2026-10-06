import type {
  CompositeCompileChild,
  IRPath,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, measureCell } from '../_cell';
import type { CellPlacement } from '../_cell';
import { resolveStack } from './resolve';
import type { IRStack } from './schema';

/** 在输入序列上一次测量，再沿指定方向放置并下沉框与标签 */
export const compileStack = (source: IRStack, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace, type, items, layout, style, label, topLabel, border, padding, ...scope } = resolveStack(source);
  void namespace;
  void type;
  const { direction, gap } = layout;
  const horizontal = direction === 'left' || direction === 'right';
  const reverse = direction === 'up' || direction === 'left';
  let mainSize = 0;
  let crossSize = 0;
  const measured = items.map((cell, index) => {
    const result = measureCell(cell, context, index, scope);
    mainSize += horizontal ? result.width : result.height;
    crossSize = Math.max(crossSize, horizontal ? result.height : result.width);
    return result;
  });
  mainSize += Math.max(0, items.length - 1) * gap;
  const width = (horizontal ? mainSize : crossSize) + padding.left + padding.right;
  const height = (horizontal ? crossSize : mainSize) + padding.top + padding.bottom;
  let cursor = 0;
  const cells: Array<CellPlacement> = measured.map(value => {
    const cellWidth = horizontal || typeof value.cell.layout.width === 'number' ? value.width : crossSize;
    const cellHeight = !horizontal || typeof value.cell.layout.height === 'number' ? value.height : crossSize;
    const size = horizontal ? cellWidth : cellHeight;
    const main = reverse ? mainSize - cursor - size : cursor;
    cursor += size + gap;
    return {
      measured: value,
      x: padding.left + (horizontal ? main : (crossSize - cellWidth) / 2),
      y: padding.top + (horizontal ? (crossSize - cellHeight) / 2 : main),
      width: cellWidth,
      height: cellHeight,
      role: 'stack-cell',
    };
  });
  const extra: Array<CompositeCompileChild> = [];
  if (border !== undefined) {
    // 从开放端一侧开始，连续经过封闭端两角，再到另一侧
    const corners: Record<typeof direction, Array<[number, number]>> = {
      up: [
        [0, 0],
        [0, height],
        [width, height],
        [width, 0],
      ],
      down: [
        [width, height],
        [width, 0],
        [0, 0],
        [0, height],
      ],
      left: [
        [0, height],
        [width, height],
        [width, 0],
        [0, 0],
      ],
      right: [
        [width, 0],
        [0, 0],
        [0, height],
        [width, height],
      ],
    };
    const points = corners[direction];
    const path: IRPath = {
      ...border,
      type: 'path',
      children: points.map((point, index) =>
        index === 0 ? { type: 'step', kind: 'move', to: point } : { type: 'step', kind: 'line', to: point },
      ),
    };
    extra.push(context.scope({}, [path]));
  }
  const top = cells.at(-1);
  if (top !== undefined && topLabel !== undefined) {
    const { font, textColor, color, opacity } = top.measured.cell.style;
    extra.push(
      context.scope({ defaults: { reset: ['node'] } }, [
        {
          type: 'node',
          position: [top.x + top.width / 2, top.y + top.height / 2],
          shape: 'rectangle',
          style: {
            fill: 'none',
            stroke: 'none',
            strokeWidth: 0,
            ...(font === undefined ? {} : { font }),
            ...(textColor === undefined ? {} : { textColor }),
            ...(color === undefined ? {} : { color }),
            ...(opacity === undefined ? {} : { opacity }),
          },
          layout: { minimumSize: { width: top.width, height: top.height }, padding: 0, margin: 0 },
          label: topLabel,
        },
      ]),
    );
  }
  return compileCells(cells, { width, height, scope, extra, decoration: { label, style } }, context);
};
