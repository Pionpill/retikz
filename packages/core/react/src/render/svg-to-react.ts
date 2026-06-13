import { type CSSProperties, type Key, type ReactElement, createElement } from 'react';
import type { SvgNode, SvgStyle } from '@retikz/render/svg';

/**
 * 呈现属性 kebab → React camelCase 映射表（手工小表，零依赖）
 * @description retikz 实际产出的呈现属性有限可枚举（~20 个）。结构属性（`viewBox` / `refX` / `markerWidth`...）
 *   已与 React 拼写一致、无连字符，不进表（passthrough 原样）；`data-*` 同样原样。React 是唯一需要把呈现
 *   属性 kebab→camelCase 的消费者（字符串 / Vanilla / Vue / Svelte 逐字用 SVG 真名）。
 */
const ATTR_KEBAB_TO_CAMEL: Record<string, string> = {
  class: 'className',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'clip-path': 'clipPath',
  'marker-start': 'markerStart',
  'marker-end': 'markerEnd',
};

/** 单个属性键 → React prop 名：呈现属性查表，结构属性 / `data-*` 原样 */
const toReactPropName = (key: string): string => ATTR_KEBAB_TO_CAMEL[key] ?? key;

/** kebab CSS 属性名 → React style camelCase（`fill`/`stroke` 单词无连字符，原样） */
const styleKeyToCamel = (key: string): string =>
  key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** SvgNode.style（kebab）→ React style 对象（camelCase） */
const toReactStyle = (style: SvgStyle): CSSProperties => {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(style)) {
    if (v !== undefined) out[styleKeyToCamel(k)] = v as string | number;
  }
  return out;
};

/**
 * `SvgNode` → React 元素（`@retikz/render/svg` 描述树的 React 薄消费层）
 * @description 仅做名字映射 + `createElement`，不持有任何渲染逻辑（逻辑全在 `@retikz/render/svg` builder）。
 *   产出 100% 正常的 React element 树：reconciliation / `key` / `React.memo` / 并发特性照常可用。
 */
export const svgToReact = (node: SvgNode | string, key?: Key): ReactElement | string => {
  if (typeof node === 'string') return node;
  const props: Record<string, unknown> = {};
  if (key !== undefined) props.key = key;
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v !== undefined) props[toReactPropName(k)] = v;
  }
  if (node.style) props.style = toReactStyle(node.style);
  const children = (node.children ?? []).map((c, i) => svgToReact(c, i));
  // 以「数组」整体传 children（保持与旧 renderPrim 的 `{lines.map(...)}` 同语义：单子节点也是数组），
  // 让 `props.children` 形态稳定（数组），下游断言 / 渲染不因子节点数量改变结构
  return children.length > 0
    ? createElement(node.tag, props, children)
    : createElement(node.tag, props);
};
