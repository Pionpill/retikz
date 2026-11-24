import type { Scene } from '@retikz/core';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { renderToSvgString } from '@retikz/render/svg';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.output.idPrefix` 显式区分。SSR 与 mount 共用同一默认，避免两处漂移导致资源 id 失配 */
export const DEFAULT_ID_PREFIX = 'r';

/** 已编译场景的 SVG 序列化选项 */
export type ToSvgStringOptions = {
  /** 字符串输出不创建 DOM runtime */
  readonly runtime?: never;
  /** 输出资源与显示尺寸选项 */
  output?: {
    /** SVG 资源 id 前缀；SSR 与客户端挂载应使用同一值 */
    idPrefix?: string;
    /** 根 SVG / Canvas 的显示宽度；缺省由 viewBox 或容器决定 */
    width?: number;
    /** 根 SVG / Canvas 的显示高度；缺省由 viewBox 或容器决定 */
    height?: number;
  };
  /** 动画播放或截帧选项 */
  animation?: {
    /** 是否播放动画；未传时跟随系统减少动态效果偏好 */
    enabled?: boolean;
    /** 静态截帧时刻（毫秒）*/
    snapshotAt?: number;
  };
};

/** 将已编译的 Scene 与宿主输出选项交给 SVG 后端，不启动处理会话 */
export const renderToSvg = (scene: Scene, options: ToSvgStringOptions = {}): string => {
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
