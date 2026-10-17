import type { Lang } from '@/i18n';

/** 跨包交接图的双语文案 */
export const pipelineOutputI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    scene: ['Scene', '确定的图元与绘制资源'],
    svg: ['SVG 后端', '生成 SvgNode 描述树'],
    canvas: ['Canvas 后端', '执行画布绘制操作'],
    svghost: ['React / DOM 宿主', '提交 SVG 元素'],
    canvashost: ['Canvas 宿主', '管理画布与显示'],
  },
  en: {
    scene: ['Scene', 'Primitives + resources'],
    svg: ['SVG backend', 'Build SvgNode tree'],
    canvas: ['Canvas backend', 'Execute drawing operations'],
    svghost: ['React / DOM host', 'Commit SVG elements'],
    canvashost: ['Canvas host', 'Manage canvas display'],
  },
};
