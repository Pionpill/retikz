import type { Lang } from '@/i18n';

/** 总览流程的双语文案 */
export const identityOverviewI18n: Record<Lang, Record<'create' | 'collect' | 'lookup' | 'query', string>> = {
  zh: {
    create: '创建身份',
    collect: '收集身份',
    lookup: '建立查找表',
    query: '查询身份',
  },
  en: {
    create: 'Create identities',
    collect: 'Collect identities',
    lookup: 'Build lookup',
    query: 'Query identities',
  },
};
