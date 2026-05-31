import { renderToSvgString as buildSvgString } from '@retikz/svg';
import { isFigure } from './builder/isFigure';
import { toScene } from './toScene';
import type { RenderInput, RenderToStringOptions } from './types';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分 */
const DEFAULT_ID_PREFIX = 'r';

/** 把 `width`/`height` 注入到开头的 `<svg` 标签（@retikz/svg 只产 viewBox） */
const injectSize = (svg: string, width?: number, height?: number): string => {
  if (width === undefined && height === undefined) return svg;
  const attrs = [width !== undefined ? ` width="${width}"` : '', height !== undefined ? ` height="${height}"` : ''].join('');
  return svg.replace(/^<svg/, `<svg${attrs}`);
};

/**
 * 把 IR / Scene / Figure 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 `Figure` 时 delegate 给 `figure.toSvgString`。收 IR/Scene 时薄包 `@retikz/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化 → 若给 `width`/`height` 注入根 `<svg>`。零 DOM。
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  if (isFigure(input)) return input.toSvgString(options);
  const svg = buildSvgString(toScene(input, options), { idPrefix: options.idPrefix ?? DEFAULT_ID_PREFIX });
  return injectSize(svg, options.width, options.height);
};
