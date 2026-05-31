import type { SvgNode } from '@retikz/svg';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 把 `SvgNode` 的 attrs / style 写到一个（可复用的）SVG 元素上
 * @description attrs 键是 SVG 真名（呈现属性 kebab / 结构属性规范拼写如 `viewBox`），SVG 命名空间下 `setAttribute`
 *   直用、零名字转换；含 `var()` 的值在 `node.style`（kebab）走 `setProperty`。mountSvg 的 root 复用也用它。
 */
export const applyAttrs = (el: SVGElement, node: SvgNode): void => {
  for (const [key, value] of Object.entries(node.attrs)) {
    if (value !== undefined) el.setAttribute(key, String(value));
  }
  if (node.style) {
    for (const [key, value] of Object.entries(node.style)) {
      if (value !== undefined && value !== null) el.style.setProperty(key, String(value));
    }
  }
};

/**
 * `SvgNode` descriptor → 真实 SVG DOM（与 react `svgToReact` 同层物化）
 * @description Scene→SvgNode 仍单一留 `@retikz/svg`；本函数只把描述树物化成 DOM。仅在**调用时**触 DOM
 *   （`document.createElementNS`），模块顶层不碰任何 DOM 全局——守 SSR 导入安全。
 */
export const svgNodeToDom = (node: SvgNode): SVGElement => {
  const el = document.createElementNS(SVG_NS, node.tag);
  applyAttrs(el, node);
  for (const child of node.children ?? []) {
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
  }
  return el;
};
