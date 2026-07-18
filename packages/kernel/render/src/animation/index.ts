/**
 * @retikz/render/animation 公开 API —— renderer 无关的动画播放基建
 *
 * 纯函数、零框架运行时：oklch 颜色插值（SVG 预采样 + Canvas 真 lerp 共用）+ 缓动注册表类型，
 * 以及 `evaluateTrack`（给时刻求值）+ 自定义 property 插值器注册表
 */

export * from './channels';
export * from './evaluate';
export * from './id-clock';
export * from './oklch';
export * from './registry';
export * from './runtime';
export * from './types';
