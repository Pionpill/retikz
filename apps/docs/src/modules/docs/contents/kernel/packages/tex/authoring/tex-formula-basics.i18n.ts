import type { Lang } from '@/i18n';

/** tex-formula-basics 的本地化文案 */
export type TexFormulaBasicsI18n = Readonly<{ inlineFormula: string; explicitMathRun: string; displayFormula: string }>;

export const texFormulaBasicsI18n: Record<Lang, TexFormulaBasicsI18n> = {
  zh: {
    inlineFormula: '行内公式：当 $v = d/t$ 时，位移 $s = vt$',
    explicitMathRun: '显式 math run：',
    displayFormula: 'display 公式：$$\\sum_{i=1}^{n} i^2$$',
  },
  en: {
    inlineFormula: 'Inline formula: when $v = d/t$, displacement is $s = vt$',
    explicitMathRun: 'Explicit math run: ',
    displayFormula: 'Display formula: $$\\sum_{i=1}^{n} i^2$$',
  },
};
