import type { Lang } from '@/i18n';

/** coordinate-conversion-flow 的本地化文案 */
export type CoordinateConversionFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
}>;

/** 按文档语言获取 coordinate-conversion-flow 文案 */
export const coordinateConversionFlowI18n: Record<Lang, CoordinateConversionFlowI18n> = {
  zh: {
    label1: '局部点',
    label2: '按角度旋转',
    label3: '按负角度旋转',
    label4: '中心图形',
    label5: '加上中心',
    label6: '减去中心',
    label7: '世界点',
  },
  en: {
    label1: 'Local point',
    label2: 'Rotate by angle',
    label3: 'Rotate by negative angle',
    label4: 'CenteredShape',
    label5: 'Add center',
    label6: 'Subtract center',
    label7: 'World point',
  },
};
