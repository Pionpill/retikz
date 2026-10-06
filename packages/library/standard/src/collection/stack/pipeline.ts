import type {
  CompositeCompileChild,
  IRPath,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';

import { compileCells, layoutLinearCells, createOperationArrow, linearDirectionVector } from '../_cell';
import { resolveStack } from './resolve';
import type { IRStack } from './schema';

/** 在输入序列上一次测量，再沿指定方向放置并下沉框与标签 */
export const compileStack = (source: IRStack, context: LayoutCompositeCompileContext): LayoutCompositeCompileResult => {
  const { namespace, type, items, layout, style, label, arrow, border, padding, ...scope } = resolveStack(source);
  const input = typeof arrow === 'object' ? arrow.input : arrow;
  const output = typeof arrow === 'object' ? arrow.output : arrow;
  void namespace;
  void type;
  const { direction } = layout;
  const { cells, width, height } = layoutLinearCells(items, { ...layout, padding, role: 'stack-cell' }, scope, context);
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
  if (cells.length > 0) {
    const [dx, dy] = linearDirectionVector(direction);
    const half = dx === 0 ? height / 2 : width / 2;
    const separation = (dx === 0 ? width : height) / 4;
    const sideSign = layout.reverseArrows ? -1 : 1;
    const point = (side: number, outward: number): [number, number] => [
      width / 2 + dx * (half + outward) - dy * side * sideSign,
      height / 2 + dy * (half + outward) + dx * side * sideSign,
    ];
    if (input)
      extra.push(
        context.scope({}, [
          createOperationArrow(input, [point(-separation - 24, 32), point(-separation, 32), point(-separation, 8)]),
        ]),
      );
    if (output)
      extra.push(
        context.scope({}, [
          createOperationArrow(output, [point(separation, 8), point(separation, 32), point(separation + 24, 32)]),
        ]),
      );
  }
  return compileCells(cells, { width, height, scope, extra, decoration: { label, style } }, context);
};
