import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

/** tex-conversion-flow 的本地化文案 */
export type TexConversionFlowI18n = Readonly<{
  label1: InputFlowEntity['text'];
  label2: InputFlowEntity['text'];
  label3: InputFlowEntity['text'];
  label4: InputFlowEntity['text'];
  label6: InputFlowEntity['text'];
  label7: string;
}>;

/** 按文档语言获取 tex-conversion-flow 文案 */
export const texConversionFlowI18n: Record<Lang, TexConversionFlowI18n> = {
  zh: {
    label1: ['layoutInlineLine()', { text: '识别后的公式片段', fill: 'gray', font: { size: 'sm' } }],
    label2: ['lowerTex()', { text: 'createLowerTex() 创建的函数', fill: 'gray', font: { size: 'sm' } }],
    label3: ['engine.convert()', { text: '引擎排版为 SVG', fill: 'gray', font: { size: 'sm' } }],
    label4: ['lowerMathJaxSvg()', { text: '转换字形与度量', fill: 'gray', font: { size: 'sm' } }],
    label6: ['layoutInlineLine()', { text: '基线布局与输出 PathPrim', fill: 'gray', font: { size: 'sm' } }],
    label7: '公式片段',
  },
  en: {
    label1: ['layoutInlineLine()', { text: 'Recognized math run', fill: 'gray', font: { size: 'sm' } }],
    label2: ['lowerTex()', { text: 'Created by createLowerTex()', fill: 'gray', font: { size: 'sm' } }],
    label3: ['engine.convert()', { text: 'Typeset as SVG', fill: 'gray', font: { size: 'sm' } }],
    label4: ['lowerMathJaxSvg()', { text: 'Convert glyphs and metrics', fill: 'gray', font: { size: 'sm' } }],
    label6: ['layoutInlineLine()', { text: 'Baseline layout and PathPrim', fill: 'gray', font: { size: 'sm' } }],
    label7: 'math run',
  },
};
