import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { renderToSvgString as buildSvgString } from '@retikz/render/svg';

import type { RenderInput, RenderToStringOptions } from './types';

import { DEFAULT_ID_PREFIX } from './constants';
import { toScene } from './to-scene';

/**
 * 把 IR / Scene / plain spec 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 IR / Scene / plain spec 时薄包 `@retikz/render/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化。`output.width` / `output.height` 直接透传给 render，由其结构化写进根
 *   `<svg>` attrs（不在本层对字符串做正则后处理）。零 DOM
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  return buildSvgString(toScene(input, options), {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate,
    snapshotAt: animation.snapshotAt,
    easings: animation.easings,
    width: output.width,
    height: output.height,
  });
};
