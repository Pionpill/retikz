import type { Lang } from '@/i18n';

/** 图中角色与处理步骤的双语文案 */
export const shadowFlowI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['shadow 输入', '预设 / 显式字段'],
    ['合并与补全', 'resolveDropShadow'],
    ['主几何样式', '已解析 shadow'],
    ['估算可见范围', '参与自动取景'],
    ['绘制投影', 'SVG / Canvas'],
  ],
  en: [
    ['Shadow input', 'Preset / explicit fields'],
    ['Merge and resolve', 'resolveDropShadow'],
    ['Geometry style', 'Resolved shadow'],
    ['Estimate extent', 'Automatic framing'],
    ['Draw shadow', 'SVG / Canvas'],
  ],
};
