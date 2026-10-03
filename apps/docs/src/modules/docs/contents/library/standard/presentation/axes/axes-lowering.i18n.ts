import type { Lang } from '@/i18n';

/** 图中步骤与辅助说明 */
export const axesLoweringI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['Axes IR', '原点 · 范围 · 分轴配置'],
    ['AxesDefinition', '识别 standard.axes'],
    ['lowering', '方向换算 · 格点枚举 · 组装'],
    ['Core IR[]', 'Path[] + Node[]'],
  ],
  en: [
    ['Axes IR', 'origin · extents\nper-axis config'],
    ['AxesDefinition', 'recognizes standard.axes'],
    ['lowering', 'direction mapping\nlattice · assembly'],
    ['Core IR[]', 'Path[] + Node[]'],
  ],
};
