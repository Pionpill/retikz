import type { Lang } from '@/i18n';

/** 过时更新示意图的双语文案 */
export const transactionStaleI18n: Record<Lang, Record<'read' | 'publish' | 'submit' | 'reject', string>> = {
  zh: {
    read: 'A 读取并开始准备\nrevision = 5',
    publish: 'B 先提交成功\n当前版本 → 6',
    submit: 'A 准备完成并提交\nbaseRevision = 5',
    reject: '拒绝过时更新\n当前版本仍为 6',
  },
  en: {
    read: 'A reads and prepares\nrevision = 5',
    publish: 'B publishes first\nCurrent revision → 6',
    submit: 'A finishes and submits\nbaseRevision = 5',
    reject: 'Stale update rejected\nRevision stays 6',
  },
};
