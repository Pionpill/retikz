import type { Lang } from '@/i18n';

/** vector-normal 的本地化文案 */
export type VectorNormalI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 vector-normal 文案 */
export const vectorNormalI18n: Record<Lang, VectorNormalI18n> = {
  zh: {
    label1: '向量',
    label2: '向量 v',
    label3: '方向角',
    label4: '长度',
    label5: '水平向量',
    label6: '对角向量',
    label7: '钝角向量',
  },
  en: {
    label1: 'Vector',
    label2: 'Vector v',
    label3: 'Angle',
    label4: 'Length',
    label5: 'Horizontal',
    label6: 'Diagonal',
    label7: 'Obtuse',
  },
};
