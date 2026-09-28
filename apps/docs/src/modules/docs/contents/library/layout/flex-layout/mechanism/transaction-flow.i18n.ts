import type { Lang } from '@/i18n';
/** 图中步骤与辅助说明 */
export const figureI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['解析输入', 'Definition / schema'],
    ['测量候选', 'layoutChild'],
    ['求解与选择', '行 / 槽位 / 平移'],
    ['回放选中候选', 'replay'],
    ['发布结果', 'Scene + artifacts'],
    ['未选候选', '不发布副产物'],
  ],
  en: [
    ['Parse input', 'Definition / schema'],
    ['Probe candidates', 'layoutChild'],
    ['Solve and select', 'Lines / slots / offsets'],
    ['Replay selected', 'replay'],
    ['Publish results', 'Scene + artifacts'],
    ['Unused candidates', 'No published effects'],
  ],
};
