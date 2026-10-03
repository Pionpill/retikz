import type { Lang } from '@/i18n';

/** 图中步骤与辅助说明 */
export const legendPipelineI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['Standard JSON IR', 'items / ramp'],
    ['LegendDefinition', '校验 + 结构 probe'],
    ['求解 slot', 'title range / body exact'],
    ['replay', '已选 child 结果'],
    ['Core IR[]', '普通 children'],
    ['LegendArtifact', '并列 compile 产物'],
  ],
  en: [
    ['Standard JSON IR', 'items / ramp'],
    ['LegendDefinition', 'validate\nstructural probes'],
    ['Resolve slot', 'title range / body exact'],
    ['replay', 'selected child\nresults'],
    ['Core IR[]', 'ordinary children'],
    ['LegendArtifact', 'parallel compile\noutput'],
  ],
};
