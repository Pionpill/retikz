import type { Lang } from '@/i18n';

/** 同一实体身份与状态内容的对照文案 */
export const identityFieldsI18n: Record<Lang, { before: string; after: string; same: string; changed: string }> = {
  zh: {
    before: '更新前的节点',
    after: '更新后的节点',
    same: 'owner + path 相同 → 同一身份',
    changed: 'color 已变化 → 状态不相等',
  },
  en: {
    before: 'Node before update',
    after: 'Node after update',
    same: 'Same owner + path → same identity',
    changed: 'Changed color → different state',
  },
};
