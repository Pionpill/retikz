import type { Lang } from '@/i18n';

/** 跨包交接图的双语文案 */
export const pipelineInputI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    jsx: ['React 声明', 'Node / Path / Step'],
    input: ['Vanilla 配置', 'InputScene / IRScene'],
    layout: ['Layout 收集', 'JSX → InputScene'],
    direct: ['直接传入', '配置与处理选项'],
    vanilla: ['Vanilla 处理入口', '统一接收两种 API'],
  },
  en: {
    jsx: ['React declarations', 'Node / Path / Step'],
    input: ['Vanilla input', 'InputScene / IRScene'],
    layout: ['Layout collects', 'JSX → InputScene'],
    direct: ['Pass input', 'Configuration + options'],
    vanilla: ['Vanilla processing', 'Shared API entry'],
  },
};
