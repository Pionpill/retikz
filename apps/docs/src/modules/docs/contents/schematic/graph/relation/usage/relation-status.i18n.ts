import type { Lang } from '@/i18n';

import { relationStatusOptions } from './relation-role.i18n';

/** 状态示例与控制面板共用文案 */
export const relationStatusI18n = {
  zh: {
    title: 'Relation 语义状态',
    status: '状态',
    options: relationStatusOptions.zh,
    source: '发送',
    target: '接收',
  },
  en: {
    title: 'Relation semantic status',
    status: 'Status',
    options: relationStatusOptions.en,
    source: 'Sender',
    target: 'Receiver',
  },
} satisfies Record<Lang, unknown>;
