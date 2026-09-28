import type { Lang } from '@/i18n';
/** 嵌套布局几何与身份说明 */
export const figureI18n: Record<Lang, { outer: string; left: string; right: string; child: string; note: string }> = {
  zh: {
    outer: '外层容器：一次编译',
    left: '内层出现 ①',
    right: '内层出现 ②',
    child: '局部 key = item',
    note: '相同局部 key 可复用；每次出现分别记录 artifact',
  },
  en: {
    outer: 'Outer container: one compilation',
    left: 'Inner occurrence 1',
    right: 'Inner occurrence 2',
    child: 'Local key = item',
    note: 'Local keys can repeat; each occurrence has its own artifact',
  },
};
