import type { Lang } from '@/i18n';

/** 组件组合总览的双语文案 */
export const compositionOverviewI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['作者输入', '折线、标题和数据'],
    define: ['准备能力', 'Source IR + Definitions'],
    expand: ['Chart 组合', 'Surface + 标题 + Plot'],
    layout: ['分配空间', 'Surface / FlexLayout'],
    lower: ['生成图形', 'Plot → Core 子声明'],
    scene: ['Scene', '图元、变换和资源'],
  },
  en: {
    input: ['Authored input', 'Line, title, and rows'],
    define: ['Prepare capabilities', 'Source IR + Definitions'],
    expand: ['Chart composition', 'Surface + title + Plot'],
    layout: ['Allocate space', 'Surface / FlexLayout'],
    lower: ['Generate geometry', 'Plot → Core children'],
    scene: ['Scene', 'Primitives and resources'],
  },
};
