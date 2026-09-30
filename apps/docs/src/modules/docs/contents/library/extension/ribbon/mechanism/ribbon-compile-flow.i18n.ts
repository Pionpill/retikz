import type { Lang } from '@/i18n';

/** Ribbon 编译流程的角色与职责 */
export const ribbonCompileFlowI18n: Record<
  Lang,
  Record<'parse' | 'options' | 'centerline' | 'boundary' | 'wrap' | 'render', readonly [string, string]>
> = {
  zh: {
    parse: ['Core：解析 Path', 'kind 查找 / schema'],
    options: ['Extension：解析选项', 'resolveRibbonOptions'],
    centerline: ['Extension：centerline', '采样、轮廓与标签'],
    boundary: ['Extension：boundary', '保留并闭合上下边界'],
    wrap: ['Core：统一输出', 'wrapOutput / 变换 / bounds'],
    render: ['Renderer：绘制', 'Scene Path → SVG / Canvas'],
  },
  en: {
    parse: ['Core: parse Path', 'Kind lookup / schema'],
    options: ['Extension: options', 'resolveRibbonOptions'],
    centerline: ['Extension: centerline', 'Sample, outline, labels'],
    boundary: ['Extension: boundary', 'Preserve and close sides'],
    wrap: ['Core: wrap output', 'wrapOutput / transforms / bounds'],
    render: ['Renderer: draw', 'Scene Path → SVG / Canvas'],
  },
};
