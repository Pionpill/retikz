import type { ReactNode } from 'react';

import type { I18nResources } from '@/i18n/locales';

/** 全部合法的 i18n 完整 key。 */
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

/** 子页递归节点。 */
export type SubPage = (SubPageBase & { children?: never }) | (SubPageBase & { children: Array<SubPage> });

/** 一级页：与 SubPage 同结构（shadcn 风格 sidebar 不再需要图标） */
export type Page = SubPage;

/** 顶层栏目分组。 */
export type Section = {
  id?: string;
  label?: I18nKey;
  pages: Array<Page>;
};
