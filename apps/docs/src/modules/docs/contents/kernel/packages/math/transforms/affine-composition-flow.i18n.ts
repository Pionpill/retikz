import type { Lang } from '@/i18n';

/** affine-composition-flow 的本地化文案 */
export type AffineCompositionFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 affine-composition-flow 文案 */
export const affineCompositionFlowI18n: Record<Lang, AffineCompositionFlowI18n> = {
  zh: {
    label1: '内层矩阵（先执行）',
    label2: '外层矩阵（后执行）',
    label3: '组合矩阵',
    label4: '合成矩阵',
    label5: '输入点',
    label6: '应用矩阵',
    label7: '变换后点',
  },
  en: {
    label1: 'Inner matrix (first)',
    label2: 'Outer matrix (second)',
    label3: 'Compose matrix',
    label4: 'Combined matrix',
    label5: 'Input point',
    label6: 'Apply matrix',
    label7: 'Transformed point',
  },
};
