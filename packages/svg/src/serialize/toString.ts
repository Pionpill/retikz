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

/**
 * Scene → SVG 字符串（SSR / 构建期产出）
 * @description 逐字序列化 `buildSvgDocument` 的描述树——零名字转换（attrs 本就是 SVG 真名）。同 scene +
 *   同 idPrefix 产逐字一致的字符串（水合前置）。
 */
export const renderToSvgString = (scene: Scene, options: BuildDocumentOptions): string =>
  serializeNode(buildSvgDocument(scene, options));
