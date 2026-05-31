import { buildSvgDocument } from '@retikz/svg';
import { applyAttrs, svgNodeToDom } from './svgNodeToDom';
import { toScene } from './toScene';
import type { MountOptions, RenderInput, VanillaView } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分 */
const DEFAULT_ID_PREFIX = 'r';

/**
 * 把 IR / Scene 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description `toScene`（收 ir 时 compile）→ `buildSvgDocument`（`@retikz/svg`）→ 物化进**稳定复用**的 root
 *   `<svg>`。`update` 原地重渲染（清 root 子节点 + 重设 root attrs + 重物化子树），**root 元素 identity 跨
 *   update 不变、不失效**（调用方持有的 `view.root` 永远有效，也为 alpha.4 在 root 挂事件委托不被冲掉）。
 *   DOM 仅在**调用时**惰性触碰，`import` 本模块不碰 DOM——守 SSR 导入安全。
 */
export const mountSvg = (container: Element, input: RenderInput, options: MountOptions = {}): VanillaView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const idPrefix = options.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');

  const renderInto = (next: RenderInput): void => {
    const doc = buildSvgDocument(toScene(next, options), { idPrefix });
    // 清空 root（子节点 + 自身 attrs），再写新 doc → root 元素复用、引用不失效
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    for (const child of doc.children ?? []) {
      root.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
    }
  };

  renderInto(input);
  container.appendChild(root);

  let disposed = false;
  return {
    root,
    update(next) {
      if (disposed) throw new Error('mountSvg: view already disposed.');
      renderInto(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.remove();
    },
  };
};
