import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const slopeMarkI18n: Record<Lang, { data: string; settings: string; override: string; point: string }> = {
  zh: { data: '数据', settings: '设置', override: '替换内建图元', point: '显示追加点' },
  en: { data: 'Data', settings: 'Settings', override: 'Replace built-in group', point: 'Show added points' },
};
