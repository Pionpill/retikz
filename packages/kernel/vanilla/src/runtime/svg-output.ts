import type { Scene } from '@retikz/core';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { renderToSvgString } from '@retikz/render/svg';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.output.idPrefix` 显式区分。SSR 与 mount 共用同一默认，避免两处漂移导致资源 id 失配 */
export const DEFAULT_ID_PREFIX = 'r';

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

/** 已编译场景的 SVG 序列化选项 */
export type RenderToStringOptions = {
  /** 字符串输出不创建 DOM runtime */
  readonly runtime?: never;
  /** 输出资源与显示尺寸选项 */
  output?: VanillaOutputOptions;
  /** 动画播放或截帧选项 */
  animation?: VanillaAnimationOptions;
};

/** 将已编译的 Scene 与宿主输出选项交给 SVG 后端，不启动处理会话 */
export const renderToSvg = (scene: Scene, options: RenderToStringOptions = {}): string => {
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());

  return renderToSvgString(scene, {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate,
    snapshotAt: animation.snapshotAt,

    width: output.width,
    height: output.height,
  });
};
