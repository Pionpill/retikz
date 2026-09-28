import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const regressionMarksI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '替换为分组二次拟合', subtitle: 'UCI Iris；同时保留原始观测点与每组二次趋势' },
  en: {
    title: 'Replace each group with a quadratic fit',
    subtitle: 'UCI Iris; retain observations alongside each quadratic trend',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    override: '替换默认图元',
    method: '拟合方法',
    method_linear: '线性',
    method_quadratic: '二次',
    strokeWidth: '线宽',
    size: '点半径',
    opacity: '不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    override: 'Replace default mark',
    method: 'Fit method',
    method_linear: 'Linear',
    method_quadratic: 'Quadratic',
    strokeWidth: 'Stroke width',
    size: 'Point radius',
    opacity: 'Opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
