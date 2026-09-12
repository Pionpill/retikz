import type { Lang } from '@/i18n';

/** tex-extensions 的本地化文案 */
export type TexExtensionsI18n = Readonly<{
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
  label13: string;
}>;

/** 按文档语言获取 tex-extensions 文案 */
export const texExtensionsI18n: Record<Lang, TexExtensionsI18n> = {
  zh: {
    label1: '拓展用法',
    label2: '引擎参数',
    label3: '公式示例',
    label4: '基础 TeX',
    label5: 'AMS 对齐环境',
    label6: '自定义命令',
    label7: '粗体数学符号',
    label8: 'bra-ket 记号',
    label9: '消去标记',
    label10: '分情况环境',
    label11: '居中否定',
    label12: '数学工具',
    label13: '颜色命令',
  },
  en: {
    label1: 'Extension usage',
    label2: 'Engine options',
    label3: 'Formula example',
    label4: 'Base TeX',
    label5: 'AMS alignment',
    label6: 'Custom command',
    label7: 'Bold math symbols',
    label8: 'Bra-ket notation',
    label9: 'Cancellation marks',
    label10: 'Cases environment',
    label11: 'Centered negation',
    label12: 'Math tools',
    label13: 'Color commands',
  },
};
