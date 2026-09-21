import type { Lang } from '@/i18n';

/** 图中角色与处理步骤的双语文案 */
export const blendFlowI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['当前图元', '颜色与 alpha'],
    ['已有背景', '之前绘制的累计结果'],
    ['计算混合颜色', 'multiply / screen / …'],
    ['按 alpha 合成', '混合色与原背景'],
    ['更新目标像素', '成为下一图元的背景'],
  ],
  en: [
    ['Current source', 'Color and alpha'],
    ['Existing backdrop', 'Accumulated previous draws'],
    ['Blend colors', 'multiply / screen / …'],
    ['Composite with alpha', 'Blended color and backdrop'],
    ['Update target pixel', 'Backdrop for the next draw'],
  ],
};
