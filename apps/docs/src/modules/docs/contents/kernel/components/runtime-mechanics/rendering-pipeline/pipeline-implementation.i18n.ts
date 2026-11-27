import type { Lang } from '@/i18n';

/** 渲染链路图的双语阶段说明 */
export const pipelineImplementationI18n: Record<Lang, { titles: Array<string>; details: Array<string> }> = {
  zh: {
    titles: [
      'convertReactToInputScene',
      'compileToScene',
      'SceneRuntime',
      'normalizeScene',
      'SceneReconciler',
      'CompileResult',
      'buildSvgDocument',
      'SVG renderer',
      'SVG DOM',
    ],
    details: [
      '收集 JSX',
      '确定宿主尺寸',
      '准备作者输入',
      '产出 IRScene',
      '产出 CompileResult',
      '携带 scene 与附加信息',
      '产出 SvgNode 树',
      '更新原生子节点',
      '提交 SVG 元素',
    ],
  },
  en: {
    titles: [
      'convertReactToInputScene',
      'compileToScene',
      'SceneRuntime',
      'normalizeScene',
      'SceneReconciler',
      'CompileResult',
      'buildSvgDocument',
      'SVG renderer',
      'SVG DOM',
    ],
    details: [
      'Collect JSX',
      'Size the host',
      'Prepare authored input',
      'Produce IRScene',
      'Produce CompileResult',
      'Scene and side outputs',
      'Build SvgNode tree',
      'Update native children',
      'Commit SVG elements',
    ],
  },
};
