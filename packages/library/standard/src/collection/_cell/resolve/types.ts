import type { IRChild } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type { IRSurface } from '../../../presentation/surface';
import type { IRCell, IRCellLayout, IRCellStyle } from '../schema';

/** 共享解析器接受 Array 额外的宽度值，Map Source 仍由其自身 schema 限定 */
export type CellResolveSource = Omit<IRCell, 'layout'> & {
  /** 单格布局输入；共享解析入口额外接受 Array 的 content 宽度策略 */
  layout?: Omit<IRCellLayout, 'width'> & {
    /** 单元格固定宽度或自动、内容驱动的宽度策略 */
    width?: number | 'auto' | 'content';
  };
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
  /** 已将字符串展开为绘图子项的内容；空格可不包含内容 */
  content?: IRChild;
  /** 完成集合、角色与单格覆盖后，并补齐基础默认值的视觉样式 */
  style: NonNullable<IRCell['style']> & {
    /** 完成继承与默认值补全的单元格填充 */
    fill: NonNullable<NonNullable<IRCell['style']>['fill']>;
    /** 完成继承与默认值补全的填充不透明度 */
    fillOpacity: number;
    /** 完成继承与默认值补全的边框绘制样式 */
    stroke: NonNullable<NonNullable<IRCell['style']>['stroke']>;
    /** 已确定的单元格圆角半径 */
    cornerRadius: number;
  };
  /** 已补齐内边距与溢出策略的布局，内边距统一为四边数值 */
  layout: Omit<NonNullable<CellResolveSource['layout']>, 'padding' | 'overflow'> & {
    /** 内容与单元格表面之间的四边内边距 */
    padding: BoundsInsets;
    /** 内容超出单元格时的可见或裁剪策略 */
    overflow: NonNullable<IRSurface['overflow']>;
  };
};
