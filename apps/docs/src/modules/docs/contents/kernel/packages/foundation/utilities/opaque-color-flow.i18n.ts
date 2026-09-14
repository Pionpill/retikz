import type { Lang } from '@/i18n';

/** opaque-color-flow 的本地化文案 */
export type OpaqueColorFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
}>;

/** 按文档语言获取 opaque-color-flow 文案 */
export const opaqueColorFlowI18n: Record<Lang, OpaqueColorFlowI18n> = {
  zh: {
    label1: '输入',
    label2: '校验权重 0..1',
    label3: '解析静态颜色',
    label4: '颜色列表',
    label5: '要求不透明背景色',
    label6: 'sRGB 源覆盖合成',
  },
  en: {
    label1: 'Inputs',
    label2: 'Validate weight 0..1',
    label3: 'Parse static colors',
    label4: 'Color list',
    label5: 'Require opaque backdrop',
    label6: 'Source-over sRGB',
  },
};
