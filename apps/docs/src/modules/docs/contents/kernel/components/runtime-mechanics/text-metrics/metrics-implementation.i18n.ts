import type { Lang } from '@/i18n';

/** 文字度量实现流程的双语文案 */
export const metricsImplementationI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    custom: ['自定义 measureText', '① 显式提供时优先'],
    canvas: ['Canvas 2D measureText', '② 未提供时，浏览器测量'],
    fallback: ['fallbackMeasurer', '③ 无环境或上下文时估算'],
    context: ['createFullCompileContext', '复用 shared.host 的度量服务'],
    content: ['layoutNodeContent', '选择普通文字／混排分支'],
    plainContent: ['普通文字排版', 'measurePhysicalText → 折行'],
    tex: ['lowerTex', 'MathJax → 尺寸、基线、路径'],
    inline: ['layoutInlineLine', '文字 measureText＋公式，基线对齐'],
    node: ['compileNodeResolution', '正文尺寸 → 节点边界'],
    scene: ['Scene', 'text／path 与已确定几何'],
    render: ['Render', 'SVG／Canvas 绘制'],
    mixed: ['混排', ''],
    plain: ['普通文字', ''],
  },
  en: {
    custom: ['Custom measureText', '① Explicit callback wins'],
    canvas: ['Canvas 2D measureText', '② Otherwise, browser metrics'],
    fallback: ['fallbackMeasurer', '③ No environment or context'],
    context: ['createFullCompileContext', 'Reuse shared.host measurement'],
    content: ['layoutNodeContent', 'Select plain / inline layout'],
    plainContent: ['Plain-text layout', 'measurePhysicalText → wrapping'],
    tex: ['lowerTex', 'MathJax → metrics, baseline, paths'],
    inline: ['layoutInlineLine', 'measureText + math; align baselines'],
    node: ['compileNodeResolution', 'Content size → node bounds'],
    scene: ['Scene', 'text / path and resolved geometry'],
    render: ['Render', 'Draw SVG / Canvas'],
    mixed: ['Inline segments', ''],
    plain: ['Plain text', ''],
  },
};
