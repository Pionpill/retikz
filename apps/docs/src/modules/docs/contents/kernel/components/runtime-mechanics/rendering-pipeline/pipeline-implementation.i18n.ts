import type { Lang } from '@/i18n';

/** 渲染链路图的双语阶段说明 */
export const pipelineImplementationI18n: Record<Lang, { titles: Array<string>; details: Array<string> }> = {
  zh: {
    titles: [
      'createInputScene',
      'compileToScene',
      'SceneRuntime',
      'normalizeScene',
      'SceneReconciler',
      'CompileResult',
      'buildSvgDocument',
      'svgToReact',
      'React DOM',
    ],
    details: [
      '收集 JSX',
      '开始单次编译',
      '准备作者输入',
      '产出 IRScene',
      '产出 CompileResult',
      '携带 scene 与附加信息',
      '产出 SvgNode 树',
      '转为 React 元素',
      '提交 SVG 元素',
    ],
  },
  en: {
    titles: [
      'createInputScene',
      'compileToScene',
      'SceneRuntime',
      'normalizeScene',
      'SceneReconciler',
      'CompileResult',
      'buildSvgDocument',
      'svgToReact',
      'React DOM',
    ],
    details: [
      'Collect JSX',
      'Start one-shot compilation',
      'Prepare authored input',
      'Produce IRScene',
      'Produce CompileResult',
      'Scene and side outputs',
      'Build SvgNode tree',
      'Create React elements',
      'Commit SVG elements',
    ],
  },
};
