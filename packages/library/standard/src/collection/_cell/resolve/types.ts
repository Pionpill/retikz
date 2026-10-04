import type { IRChild } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type { IRSurface } from '../../../presentation/surface';
import type { IRCell, IRCellLayout, IRCellStyle } from '../schema';

/** 共享解析器接受 List 额外的宽度值，Map Source 仍由其自身 schema 限定 */
export type CellResolveSource = Omit<IRCell, 'layout'> & {
  layout?: Omit<IRCellLayout, 'width'> & { width?: number | 'auto' | 'content' };
};

/** 单元格解析使用的继承配置与角色 */
export type CellResolveContext = {
  /** 集合整体样式 */
  overallStyle?: IRCellStyle;
  /** 集合整体布局 */
  overallLayout?: CellResolveSource['layout'];
  /** Map 键或值的样式覆盖 */
  roleStyle?: IRCellStyle;
  /** Map 键或值的布局覆盖 */
  roleLayout?: IRCellLayout;
  /** Map 键使用专属的最低优先级默认样式 */
  isKey?: boolean;
};

/** 继承合并后的单元格，文本已展开且 padding 已确定为四边值，Source 保持稀疏 */
export type CanonicalCell = Omit<CellResolveSource, 'content' | 'style' | 'layout'> & {
  /** 与主 id 指向同一单元格的显式名称 */
  aliasIds?: Array<string>;
  content: IRChild;
  style: NonNullable<IRCell['style']> & {
    fill: NonNullable<NonNullable<IRCell['style']>['fill']>;
    fillOpacity: number;
    stroke: NonNullable<NonNullable<IRCell['style']>['stroke']>;
    cornerRadius: number;
  };
  layout: Omit<NonNullable<CellResolveSource['layout']>, 'padding' | 'overflow'> & {
    padding: BoundsInsets;
    overflow: NonNullable<IRSurface['overflow']>;
  };
};
