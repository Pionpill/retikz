import type { Lang } from '@/i18n';

/** 图中角色与处理步骤的双语文案 */
export const blendBoundaryI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['当前：逐图元', '外部背景持续参与'],
    ['绘制子图元 A', '与已有背景合成'],
    ['绘制子图元 B', '与包含 A 的背景合成'],
    ['对照：隔离组', '当前不提供'],
    ['独立背景绘制 A、B', '得到组内合成结果'],
    ['合成整组结果', '再与外部背景合成'],
  ],
  en: [
    ['Current: per primitive', 'Outside backdrop participates'],
    ['Draw child A', 'Composite onto backdrop'],
    ['Draw child B', 'Backdrop already includes A'],
    ['Comparison: isolation', 'Not currently provided'],
    ['Draw A and B separately', 'Into an isolated group result'],
    ['Composite group result', 'Onto the outside backdrop'],
  ],
};
