import type { Lang } from '@/i18n';

/** 执行阶段标签 */
export const transformExecutionI18n: Record<Lang, Array<string>> = {
  zh: [
    'parseDataTransformDeclarations',
    'resolveParsedDataTransforms',
    'applyToView / 实现预检',
    'applyToView / 按序 apply',
    'ingestDataTransformResult',
  ],
  en: [
    'parseDataTransformDeclarations',
    'resolveParsedDataTransforms',
    'applyToView / preflight implementations',
    'applyToView / ordered apply',
    'ingestDataTransformResult',
  ],
};
