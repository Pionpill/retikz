import type { Scene } from '@retikz/core';

import type { ProcessingOptions, SingleSceneSource } from '../_input';

/** mount / renderToSvgString 的入参：已编译 `Scene`、待编译 `IRScene` 或 Vanilla InputScene */
export type InputRender = Scene | SingleSceneSource;

/** 可进入 retained Runtime 的未编译输入 */
export type InputRetainedRender = SingleSceneSource;

/** 输出资源与显示尺寸选项 */
export type VanillaOutputOptions = {
  /** SVG 资源 id 前缀；SSR 与客户端挂载应使用同一值 */
  idPrefix?: string;
  /** 根 SVG / Canvas 的显示宽度；缺省由 viewBox 或容器决定 */
  width?: number;
  /** 根 SVG / Canvas 的显示高度；缺省由 viewBox 或容器决定 */
  height?: number;
};

/** 动画渲染选项 */
export type VanillaAnimationOptions = {
  /**
   * 是否播放动画；未传时跟随系统减少动态效果偏好，显式 `true` / `false` 强制开关
   * @description `false` 渲染 base 静态图（不 emit CSS/WAAPI、Canvas 不起 rAF）；显式 `true` 会覆盖
   *   `prefers-reduced-motion`
   */
  enabled?: boolean;
  /**
   * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图（不播放、不 emit 动画），SSR 海报帧 / 缩略图用
   * @description SVG 后端把各 track 在该时刻的值烘焙成静态属性 / transform（复用 `evaluateTrack`）；覆盖 `enabled`
   */
  snapshotAt?: number;
};

/**
 * render 与 mount 入口共享的选项
 * @description `output` 管输出资源和显示尺寸；`compile` 只在输入是 IR / InputScene 时传给
 *   Core 编译；`compileResultExtension` 提供领域中立扩展接线；`animation` 控制 SVG / Canvas runtime 动画；
 */
export type CommonOptions = Pick<ProcessingOptions, 'compile' | 'compileResultExtension'> & {
  /** 输出资源与显示尺寸选项 */
  output?: VanillaOutputOptions;
  /** runtime 动画选项 */
  animation?: VanillaAnimationOptions;
};

/** SSR / build-time SVG string options；显式禁止 mount-only runtime 配置 */
export type RenderToStringOptions = CommonOptions & Readonly<{ runtime?: never }>;
