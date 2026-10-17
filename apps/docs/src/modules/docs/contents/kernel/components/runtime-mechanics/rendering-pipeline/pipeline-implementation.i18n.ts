import type { Lang } from '@/i18n';

/** 渲染链路图的双语阶段说明 */
export const pipelineImplementationI18n: Record<Lang, { titles: Array<string>; details: Array<string> }> = {
  zh: {
    titles: [
      'createInputScene',
      'prepareProcessingInput',
      'normalizeScene',
      'compileVanillaWithDriver',
      'compileToScene',
      'ProcessingResult',
      'buildSvgFrameDocument',
      'svgToReact',
      'React DOM',
    ],
    details: [
      '收集 JSX',
      '准备作者输入',
      '产出 IRScene',
      '默认同步驱动',
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
      'prepareProcessingInput',
      'normalizeScene',
      'compileVanillaWithDriver',
      'compileToScene',
      'ProcessingResult',
      'buildSvgFrameDocument',
      'svgToReact',
      'React DOM',
    ],
    details: [
      'Collect JSX',
      'Prepare authored input',
      'Produce IRScene',
      'Default sync driver',
      'Produce CompileResult',
      'Scene and side outputs',
      'Build SvgNode tree',
      'Create React elements',
      'Commit SVG elements',
    ],
  },
};
