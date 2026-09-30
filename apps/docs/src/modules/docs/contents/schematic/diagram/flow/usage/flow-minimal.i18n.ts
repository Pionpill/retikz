import type { Lang } from '@/i18n';

/** 最小 Flow 图示的双语文案 */
export const flowMinimalI18n: Record<Lang, { request: string; validate: string; store: string }> = {
  zh: { request: '接收请求', validate: '校验数据', store: '保存结果' },
  en: { request: 'Receive', validate: 'Validate', store: 'Store' },
};
