import type { Lang } from '@/i18n';

/** 编译收尾流程与输出分支 */
export const outputImplementationI18n: Record<Lang, Array<string>> = {
  zh: [
    '完成遍历',
    '装配 Scene',
    '汇总诊断与来源',
    '完成快照\n公开入口交付',
    '场景\nscene',
    '附加产物\nartifacts',
    '警告回调\nonWarn',
  ],
  en: [
    'Finish traversal',
    'Assemble Scene',
    'Diagnostics\n& provenance',
    'Complete snapshot\nPublic entry',
    'Scene\nscene',
    'Artifacts\nartifacts',
    'Warning callback\nonWarn',
  ],
};
