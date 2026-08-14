import type { SvgNode } from '@retikz/render/svg';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 把 `SvgNode` 的 attrs / style 写到可复用的 SVG 元素 */
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

/** 将 `SvgNode` 描述树物化为 SVG DOM */
export const svgNodeToDom = (node: SvgNode): SVGElement => {
  const el = document.createElementNS(SVG_NS, node.tag);
  applyAttrs(el, node);
  for (const child of node.children ?? []) {
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
  }
  return el;
};
