import type { Lang } from '@/i18n';

/** 图中角色与处理步骤的双语文案 */
export const animationFlowI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['减去 delay', '700 − 200 = 500 ms'],
    ['判断区间与 fill', '活动中 / 保留端点？'],
    ['应用 direction', '迭代编号与进度'],
    ['定位段并应用 easing', '段内进度 → 缓动进度'],
    ['插值并返回属性值', 'opacity = 0.6'],
    ['无动画值', '区间外且 fill 不保留'],
  ],
  en: [
    ['Subtract delay', '700 − 200 = 500 ms'],
    ['Check interval and fill', 'Active / retain endpoint?'],
    ['Apply direction', 'Iteration and progress'],
    ['Locate segment; ease', 'Local → eased progress'],
    ['Interpolate value', 'opacity = 0.6'],
    ['No animation value', 'Outside; fill does not retain'],
  ],
};
