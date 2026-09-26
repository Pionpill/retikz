import type { IRChild } from '@retikz/core';

import type { IRSurface } from '../../../../presentation/surface';
import type { IRCell, IRCellLayout } from '../schema';

/** 共享解析器接受 List 额外的宽度值，Map Source 仍由其自身 schema 限定 */
export type CellResolveSource = Omit<IRCell, 'layout'> & {
  layout?: Omit<IRCellLayout, 'width'> & { width?: number | 'auto' | 'content' };
};

/** 继承合并后的单元格，文本在消费时展开，Source 保持稀疏 */
export type CanonicalCell = Omit<CellResolveSource, 'content'> & {
  /** 与主 id 指向同一单元格的显式名称 */
  aliasIds?: Array<string>;
  content: IRChild;
  style: NonNullable<IRCell['style']> & {
    fill: NonNullable<NonNullable<IRCell['style']>['fill']>;
    fillOpacity: number;
    stroke: NonNullable<NonNullable<IRCell['style']>['stroke']>;
    cornerRadius: number;
  };
  layout: NonNullable<CellResolveSource['layout']> & {
    padding: NonNullable<IRSurface['padding']>;
    overflow: NonNullable<IRSurface['overflow']>;
  };
};
