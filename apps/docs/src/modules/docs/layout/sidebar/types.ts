import type { ComponentType } from 'react';

import type { DocDifficultyValue } from '@/modules/docs/data';

/**
 * 侧边栏视图契约
 * @description 三级层次：Category（分组）→ Module（一级，可带 Icon）→ SubModule（二级及以下，递归 children）
 */

/** 二级及以下菜单项（递归节点） */
export type SidebarSubModuleData = {
  /** URL 路径段 */
  value: string;
  /** 显示文字（已过 t()） */
  label: string;
  /** 叶子文档的可选阅读难度；分组不声明。 */
  difficulty?: DocDifficultyValue;
  /** 子项；存在则当前节点渲染为可展开分组，否则为叶子 */
  children?: Array<SidebarSubModuleData>;
};

/** 一级菜单项 */
export type SidebarModuleData = SidebarSubModuleData & {
  /** 显示图标，可选 */
  Icon?: ComponentType<{ className?: string }>;
};

/** 分组（一个 SidebarGroup） */
export type SidebarCategoryData = {
  /** React key 用；分组的稳定标识，但 ungrouped 分组的 value 不会出现在 URL 中 */
  value: string;
  /** 分组标题（已过 t()）；不填则该 Group 不渲染顶部 label，菜单项直接展示 */
  label?: string;
  /** 分组自身的文档路径；不存在时分组标题保持不可点击。 */
  path?: string;
  /** 无分组：菜单项直挂 module 根（URL 跳过 category 段）。默认 false */
  ungrouped?: boolean;
  /** 该分组下的菜单项 */
  modules: Array<SidebarModuleData>;
};
