import { Package } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import type { I18nResources } from '../i18n/locales/zh';

/** 全部合法的 i18n 完整 key：<ns>.<key>，给 t(...) 用 */
export type I18nKey = {
  [N in keyof I18nResources]: `${N & string}.${keyof I18nResources[N] & string}`;
}[keyof I18nResources];

/** 单个文档页：title 不存这里，由 label 在 i18n 里查 */
export type Page = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label) */
  label: I18nKey;
  /** 临时内容；后续接 MDX 真实内容时替换 */
  content: ReactNode;
  /** 标题右侧的自定义元素（外链、徽章、操作按钮等），可选 */
  extra?: ReactNode;
};

/** 顶层栏目 = 一个包 */
export type Section = {
  id: string;
  /** i18n 完整 key，调用方直接 t(label)；不填则该 Group 不渲染顶部 label */
  label?: I18nKey;
  icon?: ComponentType<{ className?: string }>;
  pages: Array<Page>;
};

/** 没真实内容的页用占位文案——通过 t('common.contentPlaceholder', { title }) 在渲染处填 */
const placeholder = (): ReactNode => null;

export const coreSection: Array<Section> = [
  {
    id: 'profile',
    pages: [{ id: 'introduction', label: 'core.intro', content: placeholder() }],
  },
  {
    id: 'core',
    label: 'core.label',
    icon: Package,
    pages: [{ id: 'core-intro', label: 'core.intro', content: placeholder() }],
  },
];
