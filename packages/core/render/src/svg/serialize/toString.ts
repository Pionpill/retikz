import type { Scene } from '@retikz/core';
import type { SvgNode, SvgStyle } from '../types';
import { type BuildDocumentOptions, buildSvgDocument } from '../builders/document';

/** 转义 attribute 值里的 XML 特殊字符（`&` 必须先转，避免二次转义） */
const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** 转义文本内容里的 XML 特殊字符 */
const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** inline style 对象 → `"k:v;k2:v2"`（键已是 CSS kebab 拼写，逐字拼） */
const serializeStyle = (style: SvgStyle): string =>
  Object.entries(style)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${String(v)}`)
    .join(';');

/** attrs 对象 → ` key="value"` 串（值逐字吐，本就是 SVG 真名，零名字转换） */
const serializeAttrs = (node: SvgNode): string => {
  const parts: Array<string> = [];
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v === undefined) continue;
    parts.push(`${k}="${escapeAttr(String(v))}"`);
  }
  if (node.style) {
    const s = serializeStyle(node.style);
    if (s) parts.push(`style="${escapeAttr(s)}"`);
  }
  return parts.length ? ` ${parts.join(' ')}` : '';
};

/** 单个 `SvgNode`（或文本）→ SVG 字符串 */
const serializeNode = (node: SvgNode | string): string => {
  if (typeof node === 'string') return escapeText(node);
  const attrs = serializeAttrs(node);
  const children = node.children ?? [];
  if (children.length === 0) return `<${node.tag}${attrs} />`;
  const inner = children.map(serializeNode).join('');
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
};

/** `renderToSvgString` 选项：文档构建项 + 根 `<svg>` 显示尺寸 */
export type RenderToStringOptions = BuildDocumentOptions & {
  /**
   * 根 `<svg>` 的 `width` 属性（显示尺寸）
   * @description 字符串 / SSR 路径无 framework adapter 写元素尺寸，故由本入口附；缺省不写、由 viewBox + CSS/容器定。
   */
  width?: number;
  /** 根 `<svg>` 的 `height` 属性（同 `width`） */
  height?: number;
};

/** 给根 `<svg>` 节点补 width/height（结构化写 attrs，避免对序列化后的字符串做正则后处理） */
const withRootSize = (root: SvgNode, width?: number, height?: number): SvgNode => {
  if (width === undefined && height === undefined) return root;
  return {
    ...root,
    attrs: {
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...root.attrs,
    },
  };
};

/**
 * Scene → SVG 字符串（SSR / 构建期产出）
 * @description 逐字序列化 `buildSvgDocument` 的描述树——零名字转换（attrs 本就是 SVG 真名）。同 scene +
 *   同 idPrefix 产逐字一致的字符串（水合前置）。给定 `width`/`height` 时结构化写进根 `<svg>` attrs（不做字符串后处理）。
 */
export const renderToSvgString = (scene: Scene, options: RenderToStringOptions): string =>
  serializeNode(withRootSize(buildSvgDocument(scene, options), options.width, options.height));
