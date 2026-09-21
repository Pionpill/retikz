import type { Lang } from '@/i18n';

/** 图中角色与处理步骤的双语文案 */
export const animationPlaybackI18n: Record<Lang, Array<readonly [string, string]>> = {
  zh: [
    ['Scene 轨道', '后端与输出模式分流'],
    ['SVG 自动播放', 'CSS @keyframes'],
    ['SVG 交互', 'WAAPI 描述 → runtime'],
    ['Canvas 播放', '时钟 → 求值 → 重绘'],
    ['SVG 静态截帧', '求值 → 静态属性'],
  ],
  en: [
    ['Scene tracks', 'Backend and output mode'],
    ['SVG autoplay', 'CSS @keyframes'],
    ['SVG interaction', 'WAAPI data → runtime'],
    ['Canvas playback', 'Clock → evaluate → redraw'],
    ['SVG snapshot', 'Evaluate → static attributes'],
  ],
};
