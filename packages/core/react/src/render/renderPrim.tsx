import type { Key, ReactElement } from 'react';
import type { ScenePrimitive } from '@retikz/core';
import { type BuildContext, buildPrim } from '@retikz/render/svg';
import { svgToReact } from './svgToReact';

/**
 * 渲染上下文——容器侧把 marker id / paint·clip url 等「全 SVG 共享」的资源回调向下传
 * @description 直接复用 `@retikz/render/svg` 的 `BuildContext`（arrowMarkerIdFor / paintRefUrl / clipRefUrl）。
 */
export type RenderContext = BuildContext;

/**
 * Scene primitive → SVG React 元素（薄绑定层）
 * @description Scene→SVG 的全部逻辑在 `@retikz/render/svg` 的 `buildPrim`（产中性 `SvgNode`）；本层只把 `SvgNode`
 *   映射成 React element（`svgToReact`，呈现属性 kebab→camelCase）。不读 IR，不复制渲染逻辑。
 */
export const renderPrim = (
  p: ScenePrimitive,
  key: Key,
  context: RenderContext = {},
): ReactElement => svgToReact(buildPrim(p, context), key) as ReactElement;
