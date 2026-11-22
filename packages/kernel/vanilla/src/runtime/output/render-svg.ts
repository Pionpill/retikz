import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import { renderToSvgString as serializeScene } from '@retikz/render/svg';

import { DEFAULT_ID_PREFIX } from './constants';
import { sceneOfResult, toSceneResult } from './to-scene';
import type { InputRender, RenderToStringOptions } from './types';

/**
 * 把 IR / Scene / InputScene 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 IR / Scene / InputScene 时薄包 `@retikz/render/svg`：`toSceneResult`
 *   → 序列化。默认在浏览器按需测量文字，无 Canvas 时使用 Core 估算器；SSR 可安全调用。
 *   `output.width` / `output.height` 直接透传给 render，由其写进根 `<svg>` attrs
 */
export const renderToSvgString = (input: InputRender, options: RenderToStringOptions = {}): string => {
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  const result = toSceneResult(input, options);

  return serializeScene(sceneOfResult(result), {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate,
    snapshotAt: animation.snapshotAt,

    width: output.width,
    height: output.height,
  });
};
