import type { Locate } from './events';

/**
 * SVG 定位层：从事件 target 沿 DOM 上溯找最近 data-retikz-id
 * @description SVG 图元是真实 DOM，直接 `closest('[data-retikz-id]')` 反查；命不中（事件落空白 / 无挂点）
 *   返回 null。renderer 无关控制器经此把 DOM 事件解析到图元 id。
 */
export const locateSvg: Locate = event => {
  const target = event.target;
  if (target === null || !(target instanceof Element)) return null;
  const hit = target.closest('[data-retikz-id]');
  return hit?.getAttribute('data-retikz-id') ?? null;
};
