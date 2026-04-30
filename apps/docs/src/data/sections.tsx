import { BarChart3, Package, Workflow } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import type { Resources } from '../i18n/locales/zh';

/** 栏目 id 受 i18n locale 中 sections 的 key 联合约束，新增栏目要在 locales 同步 key */
export type SectionId = keyof Resources['sections'];
/** 页 id 同理 */
export type PageId = keyof Resources['pages'];

/** 栏目标题的 i18n 完整 key；与 id 解耦，改名时可单独调整 */
export type SectionLabelKey = `sections.${keyof Resources['sections']}`;
/** 页标题的 i18n 完整 key */
export type PageLabelKey = `pages.${keyof Resources['pages']}`;

/** 单个文档页：title 不存这里，由 label 在 i18n 里查 */
export type Page = {
  id: PageId;
  /** i18n key（完整路径），调用方直接 t(label) */
  label: PageLabelKey;
  /** 临时内容；后续接 MDX 真实内容时替换 */
  content: ReactNode;
  /** 标题右侧的自定义元素（外链、徽章、操作按钮等），可选 */
  extra?: ReactNode;
};

/** 顶层栏目 = 一个包 */
export type Section = {
  id: SectionId;
  /** i18n key（完整路径），调用方直接 t(label) */
  label: SectionLabelKey;
  icon: ComponentType<{ className?: string }>;
  pages: Array<Page>;
};

/** 没真实内容的页用占位文案——通过 t('common.contentPlaceholder', { title }) 在渲染处填 */
const placeholder = (): ReactNode => null;

export const sections: Array<Section> = [
  {
    id: 'core',
    label: 'sections.core',
    icon: Package,
    pages: [{ id: 'core-intro', label: 'pages.core-intro', content: placeholder() }],
  },
  {
    id: 'plot',
    label: 'sections.plot',
    icon: BarChart3,
    pages: [{ id: 'plot-intro', label: 'pages.plot-intro', content: placeholder() }],
  },
  {
    id: 'flow',
    label: 'sections.flow',
    icon: Workflow,
    pages: [{ id: 'flow-intro', label: 'pages.flow-intro', content: placeholder() }],
  },
];
