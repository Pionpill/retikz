import type { Lang } from '@/i18n';

/** 同一组数据从候选到发布的对照文案 */
export const lifecycleStateI18n: Record<
  Lang,
  Record<
    'before' | 'candidate' | 'after' | 'revision' | 'source' | 'result' | 'display' | 'identity' | 'pending',
    string
  >
> = {
  zh: {
    before: '已发布状态',
    candidate: '准备阶段',
    after: '成功发布后',
    revision: '版本',
    source: '来源值',
    result: '计算结果',
    display: '公开显示',
    identity: 'A 的身份',
    pending: '已发布 0 / 候选 1',
  },
  en: {
    before: 'Published state',
    candidate: 'During preparation',
    after: 'After publication',
    revision: 'Revision',
    source: 'Source values',
    result: 'Result',
    display: 'Public display',
    identity: 'Identity of A',
    pending: 'Published 0 / candidate 1',
  },
};
