import type { IRChild, IRNode } from '@retikz/core';
import type { IRFlexLayout } from '@retikz/layout/compose';

import type { InputSurfaceConfig } from '../../presentation';

/** 包内结构区域的组合参数，不是持久化 Source 或公开 authoring 输入 */
export type BlockStructureOptions = Omit<InputSurfaceConfig, 'namespace' | 'type' | 'child'> &
  Pick<IRFlexLayout, 'size' | 'gap' | 'justifyContent' | 'alignItems'> & {
    /** 以声明顺序排列的任意合法绘图子项 */
    children?: Array<IRChild>;
  };

/** 包内 Header 的主体与显式辅助绘图配置 */
export type BlockHeaderOptions = BlockStructureOptions & {
  /** 单个辅助绘图，保留自然宽度 */
  accessory?: IRChild;
  /** 主体纵向相邻内容的间距，沿用 Flex gap 契约
   * @default 4
   */
  contentGap?: IRFlexLayout['gap'];
};

/** 普通 Core Node 的包内文字角色配置 */
export type BlockTextOptions = Omit<IRNode, 'type' | 'text'> & {
  /** 直接交给 Core 文字测量与编译的内容 */
  text: NonNullable<IRNode['text']>;
};
