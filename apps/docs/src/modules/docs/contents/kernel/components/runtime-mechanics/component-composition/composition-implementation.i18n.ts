import type { Lang } from '@/i18n';

/** 组件组合实现流程的双语文案 */
export const compositionImplementationI18n: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    adapter: ['输入适配', 'ConnectedScatterChartInputEmbedAdapter'],
    registry: ['装配 Definition', 'resolveCoreProviderDependencies'],
    chart: ['Chart', 'createChartDefinition'],
    surface: ['Surface', 'compileSurface'],
    flex: ['FlexLayout', 'compileFlexLayout'],
    plot: ['Plot', 'lowerPlots → lowerPlot'],
    core: ['Core', '子声明编译与 replay'],
    scene: ['Scene', '结果汇总'],
  },
  en: {
    adapter: ['Adapt input', 'ConnectedScatterChartInputEmbedAdapter'],
    registry: ['Assemble definitions', 'resolveCoreProviderDependencies'],
    chart: ['Chart', 'createChartDefinition'],
    surface: ['Surface', 'compileSurface'],
    flex: ['FlexLayout', 'compileFlexLayout'],
    plot: ['Plot', 'lowerPlots → lowerPlot'],
    core: ['Core', 'Compile children and replay'],
    scene: ['Scene', 'Combined output'],
  },
};
