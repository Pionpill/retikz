import type { ComponentType } from 'react';

/**
 * 侧边栏的数据契约——参考 fx-data-nines 的 SidebarCategoryData / SidebarModuleData，
 * 但裁掉了 author / generateType / updateDate / href 这些 retikz 用不到的字段。
 *
 * 数据形态：
 *   Category（分组：在 sidebar 上显示为 SidebarGroupLabel + 一组 modules）
 *     └── Module（菜单项：图标 + 文字，点击跳转）
 */

/** 单个菜单项 */
export type SidebarModuleData = {
  /** URL 路径段（与 i18n 中 pages.<value> 对应） */
  value: string;
  /** 显示文字（已过 t()） */
  label: string;
  /** 显示图标，可选 */
  Icon?: ComponentType<{ className?: string }>;
};

/** 分组（一个 SidebarGroup） */
export type SidebarCategoryData = {
  /** URL 第一段（与 i18n 中 sections.<value> 对应） */
  value: string;
  /** 分组标题（已过 t()）；不填则该 Group 不渲染顶部 label，菜单项直接展示 */
  label?: string;
  /** 该分组下的菜单项 */
  modules: Array<SidebarModuleData>;
};
