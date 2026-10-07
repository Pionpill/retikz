import type { IRScopeProps, LayoutCompositeCompileContext } from '@retikz/core';

import { measureCellChild } from '../_cell';
import type { CanonicalCollectionIndex } from './resolve';

/** 测量一条索引文本，空标签保留位置但不创建绘图子项 */
export const measureCollectionIndex = (
  options: Exclude<CanonicalCollectionIndex, false>,
  index: number,
  occurrence: number,
  scope: IRScopeProps,
  context: LayoutCompositeCompileContext,
) => {
  const text = options.labels === undefined ? String(options.start + index) : options.labels[index];
  if (text === '') return undefined;

  return measureCellChild(
    context,
    {
      type: 'node',
      position: [0, 0],
      text,
      style: { fill: 'none', stroke: 'none', ...options.style },
      layout: { padding: 0, margin: 0 },
    },
    occurrence,
    scope,
  );
};
