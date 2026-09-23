import type { IRChild } from '@retikz/core';

import type { IRSurface } from '../../../../presentation/surface';
import type { IRCell } from '../schema';

/** 继承合并后的单元格，文本在消费时展开，Source 保持稀疏 */
export type CanonicalCell = Omit<IRCell, 'content'> & {
  /** 与主 id 指向同一单元格的显式名称 */
  aliasIds?: Array<string>;
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
