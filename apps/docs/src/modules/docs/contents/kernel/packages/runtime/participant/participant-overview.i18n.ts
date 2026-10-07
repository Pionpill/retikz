import type { Lang } from '@/i18n';

/** 提交流程图的双语文案 */
export const participantOverviewI18n: Record<Lang, Record<'candidate' | 'external' | 'publish', string>> = {
  zh: {
    candidate: '候选结果',
    external: '准备与应用外部修改',
    publish: '发布版本与读取视图',
  },
  en: {
    candidate: 'Candidate results',
    external: 'Prepare and apply changes',
    publish: 'Publish revision and views',
  },
};
