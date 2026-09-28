import type { Lang } from '@/i18n';

/** 最小请求流程的展示文本 */
export const requestFlowI18n: Record<Lang, { title: string; request: string; process: string; result: string }> = {
  zh: { title: '请求处理', request: '接收请求', process: '处理任务', result: '返回结果' },
  en: { title: 'Request handling', request: 'Receive request', process: 'Process task', result: 'Return result' },
};
