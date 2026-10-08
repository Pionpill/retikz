import type { Lang } from '@/i18n';

/** 字段声明解析流程的双语节点文案 */
export const fieldResolutionI18n: Record<
  Lang,
  Record<'input' | 'infer' | 'declared' | 'format' | 'parse' | 'order' | 'output', { title: string; detail: string }>
> = {
  zh: {
    input: { title: '字段声明 + 原始数据', detail: 'name 标识字段；先校验声明组合' },
    infer: { title: 'type、format 均省略', detail: '样本推断 · 默认转换' },
    declared: { title: '有 type，无 format', detail: '声明类型 · 默认转换' },
    format: { title: '有 format', detail: '格式类型 · 格式解析器' },
    parse: { title: '解析字段值', detail: '按 name 取值，应用选定的解析规则' },
    order: { title: '检查分类顺序', detail: 'order 仅用于分类；省略按出现序' },
    output: { title: '字段模型与规范值', detail: '交给后续处理；不重排数据行' },
  },
  en: {
    input: { title: 'Field declaration + raw data', detail: 'name identifies the field; validate the declaration' },
    infer: { title: 'Neither type nor format', detail: 'Inferred type · default coercion' },
    declared: { title: 'type, no format', detail: 'Declared type · default coercion' },
    format: { title: 'With format', detail: 'Format type · format parser' },
    parse: { title: 'Parse field values', detail: 'Read by name; apply the selected parsing rule' },
    order: {
      title: 'Check category order',
      detail: 'Categories only; appearance if omitted',
    },
    output: { title: 'Field model and canonical values', detail: 'Ready for consumers; row order unchanged' },
  },
};
