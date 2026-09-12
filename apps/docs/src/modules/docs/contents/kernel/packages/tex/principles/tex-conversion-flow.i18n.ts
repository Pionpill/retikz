import type { Lang } from '@/i18n';

/** tex-conversion-flow 的本地化文案 */
export type TexConversionFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 tex-conversion-flow 文案 */
export const texConversionFlowI18n: Record<Lang, TexConversionFlowI18n> = {
  zh: {
    label1: 'Core 文本管线',
    label2: 'LowerTex 适配器',
    label3: 'MathJax SVG 引擎',
    label4: 'SVG 降解器',
    label6: 'Core Scene 输出',
    label7: '公式片段',
  },
  en: {
    label1: 'Core text pipeline',
    label2: 'LowerTex adapter',
    label3: 'MathJax SVG engine',
    label4: 'SVG lowerer',
    label6: 'Core Scene output',
    label7: 'math run',
  },
};
