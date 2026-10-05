import type { Lang } from '@/i18n';

/** 图中步骤与辅助说明 */
export const figureI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['初始测量', 'minimum / natural'],
    ['冻结主轴槽位', '逐行求解分配'],
    ['精确重测', 'exact 主轴宽度'],
    ['交叉轴与放置', '换行高度 / 基线'],
  ],
  en: [
    ['Probe children', 'minimum / natural'],
    ['Freeze main slots', 'Solve each line'],
    ['Remeasure', 'exact main size'],
    ['Place children', 'Height / baselines'],
  ],
};
