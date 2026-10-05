import type { Lang } from '@/i18n';

/** 处理阶段及其数据含义 */
export const figureI18n = {
  zh: [
    ['测量全部子项', 'minimum / natural'],
    ['筛选尺寸贡献', '仅 include 参与'],
    ['确定容器', '内容区与尺寸策略'],
    ['放置全部子项', 'exclude 仍然可见'],
  ],
  en: [
    ['Measure all items', 'minimum / natural'],
    ['Select contributions', 'include items only'],
    ['Resolve container', 'Content box / size policy'],
    ['Place all items', 'exclude is still visible'],
  ],
} satisfies Record<Lang, Array<readonly [string, string]>>;
