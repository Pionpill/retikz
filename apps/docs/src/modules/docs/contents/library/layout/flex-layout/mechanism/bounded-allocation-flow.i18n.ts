import type { Lang } from '@/i18n';

/** 图中步骤与辅助说明 */
export const figureI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['计算余量', '扣除间距与基础尺寸'],
    ['按权重分配', 'grow 或 shrink × basis'],
    ['钳制到边界', '命中 min / max 冻结'],
    ['还能继续？', '有余量且有可分配项'],
    ['分配结束', '保留未吸收的余量'],
    ['是', ''],
    ['否', ''],
  ],
  en: [
    ['Compute free space', 'Subtract gaps and bases'],
    ['Distribute', 'grow or shrink × basis'],
    ['Clamp and freeze', 'Respect min / max'],
    ['Continue?', 'Space + eligible items'],
    ['Finish allocation', 'Keep residual space'],
    ['Yes', ''],
    ['No', ''],
  ],
};
