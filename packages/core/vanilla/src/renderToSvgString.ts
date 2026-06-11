import { renderToSvgString as buildSvgString } from '@retikz/render/svg';
import { isFigure } from './builder/isFigure';
import { DEFAULT_ID_PREFIX } from './constants';
import { toScene } from './toScene';
import type { RenderInput, RenderToStringOptions } from './types';

/**
 * 把 IR / Scene / Figure 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 `Figure` 时 delegate 给 `figure.toSvgString`。收 IR/Scene 时薄包 `@retikz/render/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化。`width`/`height` 直接透传给 render，由其结构化写进根
 *   `<svg>` attrs（不在本层对字符串做正则后处理）。零 DOM。
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  if (isFigure(input)) return input.toSvgString(options);
  return buildSvgString(toScene(input, options), {
    idPrefix: options.idPrefix ?? DEFAULT_ID_PREFIX,
    animate: options.animate,
    snapshotAt: options.snapshotAt,
    easings: options.easings,
    width: options.width,
    height: options.height,
  });
};
