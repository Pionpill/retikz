import type { ComponentType } from 'react';

/**
 * 侧边栏视图契约——参考 fx-data-nines 的 SidebarCategoryData / SidebarModuleData / SidebarItemData，
 * 但裁掉了 author / generateType / updateDate / href 等 retikz 用不到的字段。
 *
 * 数据形态（约定最多三级）：
 *   Category（分组：SidebarGroupLabel + 一组 modules）
 *     └── Module（一级菜单项：Icon + 文字；可有 children）
 *           └── SubModule（二级及以下：纯文字，递归 children）
 */

/** 二级及以下菜单项（递归节点） */
export type SidebarSubModuleData = {
  /** URL 路径段 */
  value: string;
  /** 显示文字（已过 t()） */
  label: string;
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
  /** URL 第一段 */
  value: string;
  /** 分组标题（已过 t()）；不填则该 Group 不渲染顶部 label，菜单项直接展示 */
  label?: string;
  /** 该分组下的菜单项 */
  modules: Array<SidebarModuleData>;
};
