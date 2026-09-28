import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const regressionCompareI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '比较整体线性与多项式拟合', subtitle: '线性与多项式趋势共享一层观测点；趋势不代表因果关系' },
  en: {
    title: 'Compare pooled linear and polynomial fits',
    subtitle: 'Linear and polynomial trends share one observation layer; trends do not imply causation',
  },
};

/** 交互面板的双语文案 */
export const controlI18n = {
  zh: {
    data: '数据',
    settings: '配置',
    samples: '输入数据',
    curve: '趋势连接',
    smooth: '过点曲线',
    linear: '折线',
    sampleCount: '趋势采样数',
    order: '多项式阶数',
    linearColor: '线性趋势颜色',
    polynomialColor: '多项式趋势颜色',
    strokeWidth: '线宽',
    dashed: '多项式虚线',
    size: '点半径',
    opacity: '不透明度',
  },
  en: {
    data: 'Data',
    settings: 'Settings',
    samples: 'Input rows',
    curve: 'Trend connection',
    smooth: 'Interpolating curve',
    linear: 'Polyline',
    sampleCount: 'Trend samples',
    order: 'Polynomial order',
    linearColor: 'Linear trend color',
    polynomialColor: 'Polynomial trend color',
    strokeWidth: 'Stroke width',
    dashed: 'Dashed polynomial',
    size: 'Point radius',
    opacity: 'Opacity',
  },
} satisfies Record<Lang, Record<string, string>>;
