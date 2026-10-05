import { translateEntityApiReference } from './entity.en';

/** Group 专属说明译文 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '将 Group Source 接入 React 编写流程': 'Integrate Group Source into React authoring',
  'Group Source 的 React 编写参数': 'React authoring props for Group Source',
  '任意 Kernel 或 Tier 2 semantic children': 'Arbitrary Kernel or Tier 2 semantic children',
  '创建 Group Source 的 authoring embed 节点': 'Create a Group Source authoring embed',
  'Group embed 的 Source authoring 输入': 'Source authoring input for a Group embed',
  '将 Group authoring 输入组装为单个 Source composite': 'Assemble Group authoring input into one Source composite',
  '与 Group Source 对齐、但允许 Vanilla child authoring sugar 的输入':
    'Input aligned with Group Source, allowing Vanilla child authoring sugar',
  'Group Source 的 InputEmbed adapter': 'InputEmbed adapter for Group Source',
  '组装 Group Source composite': 'Create a Group Source composite',
  'Group Source 工厂输入': 'Group Source factory input',
  'Group 结构化 caption': 'Structured Group caption',
  'Group caption 文本项': 'Group caption text item',
};
/** 共享 Graph 说明复用 Entity 译文 */
export const translateGroupApiReference = (source: string): string =>
  translations[source.replace(/\r/g, '')] ?? translateEntityApiReference(source);
