import { renderToSvgString as buildSvgString } from '@retikz/svg';
import { toScene } from './toScene';
import type { RenderInput, RenderToStringOptions } from './types';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分 */
const DEFAULT_ID_PREFIX = 'r';

/**
 * 把 IR / Scene 渲染成 SVG 字符串（SSR / 构建期）
 * @description 薄包 `@retikz/svg` 的 `renderToSvgString`，零 DOM、模块顶层不触 DOM 全局。收 `ir` 时经
 *   `toScene` 编译（measureText 缺省走 core fallback、确定性可运行）；收 `scene` 直接序列化。
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string =>
  buildSvgString(toScene(input, options), { idPrefix: options.idPrefix ?? DEFAULT_ID_PREFIX });
