import type { DocLayoutVariant } from '@/modules/docs/data';

import { mdxHasToc } from '@/modules/docs/components/mdx-content/utils';

export type ResolveDocPagePresentationInput = {
  /** 当前页显式声明的阅读布局 */
  layout: DocLayoutVariant;
  /** 当前稳定 MDX 源码 */
  source: string | null;
  /** 是否为数据驱动的更新日志页面 */
  isChangelog: boolean;
};

export type DocPagePresentation = {
  /** 标题、正文与底部导航共享的宽度 class */
  contentClassName: string;
  /** 是否渲染并占用右侧目录 */
  hasToc: boolean;
};

/** 解析文档页宽度与 TOC 行为，不从路由名称猜测布局 */
export const resolveDocPagePresentation = (input: ResolveDocPagePresentationInput): DocPagePresentation => {
  const { layout, source, isChangelog } = input;
  const showcase = layout === 'showcase';

  return {
    contentClassName: showcase ? 'max-w-[1200px]' : 'max-w-200',
    hasToc: !showcase && !isChangelog && source !== null && mdxHasToc(source),
  };
};
