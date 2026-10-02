import type { Lang } from '@/i18n';

/** 图中步骤与辅助说明 */
export const frameLoweringI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['Standard JSON IR', 'Frame 字段'],
    ['FrameDefinition', '校验 · 匹配'],
    ['lowering', '标题排布 · 边界 · 内边距'],
    ['Core IR[]', 'Scope · Path · Node'],
  ],
  en: [
    ['Standard JSON IR', 'Frame fields'],
    ['FrameDefinition', 'validate · match'],
    ['lowering', 'header · bounds · padding'],
    ['Core IR[]', 'Scope · Path · Node'],
  ],
};
