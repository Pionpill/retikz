import type { Lang } from '@/i18n';

/** Graph 总览示意图的双语文本 */
export const graphOverviewI18n: Record<Lang, { client: string; service: string }> = {
  zh: { client: '客户端', service: '服务' },
  en: { client: 'Client', service: 'Service' },
};
