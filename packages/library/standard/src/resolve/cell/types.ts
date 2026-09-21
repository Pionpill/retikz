import type { IRChild } from '@retikz/core';

import type { IRCell } from '../../composites/presentation/shared/schemas';
import type { IRSurface } from '../../composites/presentation/surface';

/** 继承合并后的单元格，文本在消费时展开，Source 保持稀疏 */
export type CanonicalCell = Omit<IRCell, 'content'> & {
  content: IRChild;
  style: NonNullable<IRCell['style']> & {
    fill: NonNullable<NonNullable<IRCell['style']>['fill']>;
    fillOpacity: number;
    stroke: NonNullable<NonNullable<IRCell['style']>['stroke']>;
    cornerRadius: number;
  };
  layout: NonNullable<IRCell['layout']> & {
    padding: NonNullable<IRSurface['padding']>;
    overflow: NonNullable<IRSurface['overflow']>;
  };
};
