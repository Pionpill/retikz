import type { ReactNode } from 'react';
import type { I18nResources } from '../i18n/locales/zh';

/** 全部合法的 i18n 完整 key：<ns>.<key>，给 t(...) 用 */
export type I18nKey = {
  [N in keyof I18nResources]: `${N & string}.${keyof I18nResources[N] & string}`;
}[keyof I18nResources];

type SubPageBase = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label) */
  label: I18nKey;
  /** 标题右侧的自定义元素（外链、徽章、操作按钮等），可选 */
  extra?: ReactNode;
};

/**
 * 子页（递归节点）二选一：
 * - **叶子**：不带 children。侧边栏点击 → 跳路由 → 加载 contents 下对应 mdx 渲染
 * - **分组**：带非空 children。侧边栏点击 → 展开/收起，自身不导航
 *
 * 两者类型互斥：分组上写 children，叶子上不写。判别式联合保证两种写法不会混在同一个节点。
 */
export type SubPage =
  | (SubPageBase & { children?: never })
  | (SubPageBase & { children: Array<SubPage> });

/** 一级页：与 SubPage 同结构（shadcn 风格 sidebar 不再需要图标） */
export type Page = SubPage;

/**
 * 顶层栏目 = 一个分组。
 * - **grouped**：填 id + label，URL 为 `/<module>/<sectionId>/<pageId>(/<subPageId>)?`，sidebar 会渲染顶部分组标题
 * - **ungrouped**：id 与 label 都不填，URL 为 `/<module>/<pageId>`，sidebar 直接出 page 列表（无分组标题）
 *
 * 约定：id 与 label 共生 —— 要么都有要么都没。一个 module 至多一个 ungrouped section。
 * ungrouped page 必须是叶子（不带 children），否则路由 2-段 URL 会有歧义。
 */
export type Section = {
  id?: string;
  label?: I18nKey;
  pages: Array<Page>;
};
