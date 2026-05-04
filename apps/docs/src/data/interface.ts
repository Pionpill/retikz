import type { ComponentType, ReactNode } from 'react';
import type { I18nResources } from '../i18n/locales/zh';

/** 全部合法的 i18n 完整 key：<ns>.<key>，给 t(...) 用 */
export type I18nKey = {
  [N in keyof I18nResources]: `${N & string}.${keyof I18nResources[N] & string}`;
}[keyof I18nResources];

/**
 * 子页（递归节点）：
 * - 可作为叶子（content 必填、children 缺省）
 * - 可作为分组（children 非空，content 通常省略）
 * - 约定最多嵌套到三级（一级 Page → 二级 SubPage → 三级 SubPage）
 */
export type SubPage = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label) */
  label: I18nKey;
  /** 临时内容；后续接 MDX 真实内容时替换。children 存在时可省略 */
  content?: ReactNode;
  /** 标题右侧的自定义元素（外链、徽章、操作按钮等），可选 */
  extra?: ReactNode;
  /** 子页 */
  children?: Array<SubPage>;
};

/** 一级页：在 sidebar 上以带图标的 module 形态展示 */
export type Page = SubPage & {
  /** 菜单项左侧图标，可选 */
  icon?: ComponentType<{ className?: string }>;
};

/** 顶层栏目 = 一个包 */
export type Section = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label)；不填则该 Group 不渲染顶部 label */
  label?: I18nKey;
  /** 内容 */
  pages: Array<Page>;
};
