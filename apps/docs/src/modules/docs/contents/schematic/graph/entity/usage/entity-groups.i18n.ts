import type { Lang } from '@/i18n';

/** 实体分组示例的文字 */
export const entityGroupsI18n: Record<Lang, ReadonlyArray<ReadonlyArray<string>>> = {
  zh: [
    ['收集需求', '确认范围'],
    ['设计方案', '开发功能', '验收结果'],
    ['接收反馈', '定位问题', '修复问题', '回访用户'],
  ],
  en: [
    ['Gather needs', 'Set scope'],
    ['Design', 'Build', 'Review'],
    ['Receive feedback', 'Investigate', 'Fix issue', 'Follow up'],
  ],
};
