import type { Lang } from '@/i18n';

/** 坐标解析总览的阶段文案 */
export const coordinateOverviewI18n: Record<
  Lang,
  Record<'input' | 'context' | 'resolve' | 'layout' | 'close' | 'output', string>
> = {
  zh: {
    input: '位置表达与引用',
    context: '读取可见名称与当前变换',
    resolve: '完成定位与布局',
    layout: '注册世界引用几何',
    close: '闭合 Scope 并回填路径',
    output: '局部图元与分组变换',
  },
  en: {
    input: 'Positions and references',
    context: 'Read names and current transforms',
    resolve: 'Resolve placement and layout',
    layout: 'Register world reference geometry',
    close: 'Finalize Scope and deferred paths',
    output: 'Local primitives and group transforms',
  },
};
