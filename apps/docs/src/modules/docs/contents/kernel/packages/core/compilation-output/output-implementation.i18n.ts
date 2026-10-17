import type { Lang } from '@/i18n';

/** 编译收尾流程与输出分支 */
export const outputImplementationI18n: Record<Lang, Array<string>> = {
  zh: [
    '完成遍历',
    '装配 Scene',
    '观测与空间索引',
    '完成快照\n公开入口交付',
    '场景\nscene',
    '附加产物\nartifacts',
    '空间句柄\nspatialHandles',
    '观测结果（可选）\nobserverOutputs',
    '警告回调\nonWarn',
  ],
  en: [
    'Finish traversal',
    'Assemble Scene',
    'Observations\n& spatial index',
    'Complete snapshot\nPublic entry',
    'Scene\nscene',
    'Artifacts\nartifacts',
    'Spatial handles\nspatialHandles',
    'Optional observations\nobserverOutputs',
    'Warning callback\nonWarn',
  ],
};
