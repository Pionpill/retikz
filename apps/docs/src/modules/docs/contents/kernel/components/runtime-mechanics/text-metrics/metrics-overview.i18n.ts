import type { Lang } from '@/i18n';

/** 文字度量总览的双语文案 */
export const metricsOverviewI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    input: ['文字与字体', '作者输入'],
    provide: ['度量提供方', '文字尺寸／公式路径'],
    content: ['Core 正文排版', '行宽、行高与基线'],
    node: ['Core 节点与连接', '尺寸、边界和端点'],
    scene: ['Scene', '文字与路径图元'],
    render: ['Render', 'SVG / Canvas 画面'],
  },
  en: {
    input: ['Text and font', 'Authored input'],
    provide: ['Metric providers', 'Text sizes / formula paths'],
    content: ['Core content layout', 'Lines and baselines'],
    node: ['Core geometry', 'Node bounds and endpoints'],
    scene: ['Scene', 'Text and path primitives'],
    render: ['Render', 'SVG / Canvas output'],
  },
};
