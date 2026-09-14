import type { Lang } from '@/i18n';

/** tex-playground 的本地化文案 */
export type TexPlaygroundI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
  label10: string;
  label11: string;
  label12: string;
}>;

/** 按文档语言获取 tex-playground 文案 */
export const texPlaygroundI18n: Record<Lang, TexPlaygroundI18n> = {
  zh: {
    label1: '公式',
    label2: '公式',
    label3: 'TeX 源码',
    label4: '度量模式',
    label5: '行内',
    label6: '显示',
    label7: '字号',
    label8: '公式示例',
    label9: '自定义',
    label10: '行内质能方程',
    label11: 'Display 求和',
    label12: '多行导数',
  },
  en: {
    label1: 'Formula',
    label2: 'Formula',
    label3: 'TeX source',
    label4: 'Metrics',
    label5: 'inline',
    label6: 'display',
    label7: 'Font size',
    label8: 'Formula example',
    label9: 'Custom',
    label10: 'Inline mass-energy',
    label11: 'Display summation',
    label12: 'Multiline derivatives',
  },
};
