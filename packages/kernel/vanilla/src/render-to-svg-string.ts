import { renderToSvgString as buildSvgString } from '@retikz/render/svg';

import type { RenderInput, RenderToStringOptions } from './types';

import { isFigure } from './builder/is-figure';
import { DEFAULT_ID_PREFIX } from './constants';
import { toScene } from './to-scene';

/**
 * 把 IR / Scene / Figure 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 `Figure` 时 delegate 给 `figure.toSvgString`。收 IR/Scene 时薄包 `@retikz/render/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化。`output.width` / `output.height` 直接透传给 render，由其结构化写进根
 *   `<svg>` attrs（不在本层对字符串做正则后处理）。零 DOM。
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  if (isFigure(input)) return input.toSvgString(options);
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  return buildSvgString(toScene(input, options), {
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
    animate: animation.enabled,
    snapshotAt: animation.snapshotAt,
    easings: animation.easings,
    width: output.width,
    height: output.height,
  });
};
