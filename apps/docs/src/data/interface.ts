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
 * 子页（递归节点）二选一
 * @description 叶子（无 children）点击跳路由加载 mdx；分组（带非空 children）点击展开/收起、自身不导航；判别式联合保证两种写法不混在同一节点
 */
export type SubPage =
  | (SubPageBase & { children?: never })
  | (SubPageBase & { children: Array<SubPage> });

/** 一级页：与 SubPage 同结构（shadcn 风格 sidebar 不再需要图标） */
export type Page = SubPage;

/**
 * 顶层栏目 = 一个分组
 * @description grouped（id + label 同填）URL `/<module>/<sectionId>/<pageId>(/<subPageId>)?` sidebar 出顶部标题；ungrouped（id + label 同空）URL `/<module>/<pageId>` 直出 page 列表；一个 module 至多一个 ungrouped section，且 ungrouped page 必须是叶子（否则 2-段 URL 歧义）
 */
export type Section = {
  id?: string;
  label?: I18nKey;
  pages: Array<Page>;
};
