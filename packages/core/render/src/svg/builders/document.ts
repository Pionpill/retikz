import type { ArrowEndSpec, Scene, ScenePrimitive } from '@retikz/core';
import type { SvgNode } from '../types';
import { formatViewBox } from '../viewBox';
import { type BuildContext, buildPrim } from './prim';
import { buildPaintDef } from './paintDefs';
import { buildClipDef } from './clipDefs';
import { buildArrowMarker } from './arrowMarkers';
import { collectArrowSpecs, hashKey, stableSpecKey } from './arrowCollect';

/** `buildSvgDocument` / `buildSvgFragment` 选项 */
export type BuildDocumentOptions = {
  /**
   * id 前缀——所有 `<defs>` 资源 id（marker / paint / clip）与对应 `url(#...)` 引用共用此前缀确保唯一
   * @description 同 scene + 同 idPrefix → 逐字一致的 id（水合前置）；不同 idPrefix → id 无交集（多实例隔离）。
   *   caller 注入（React 用剥冒号的 `useId()`；SSR / Vanilla 显式给）。
   */
  idPrefix: string;
};

/** 按 idPrefix 派生确定性的资源 id / 引用回调，并组装 builder context */
const makeContext = (
  idPrefix: string,
): {
  context: BuildContext;
  arrowMarkerIdFor: (spec: ArrowEndSpec) => string;
  paintIdFor: (id: string) => string;
  clipIdFor: (id: string) => string;
} => {
  const arrowMarkerIdFor = (spec: ArrowEndSpec): string =>
    `retikz-arrow-${idPrefix}-${hashKey(stableSpecKey(spec))}`;
  const paintIdFor = (id: string): string => `retikz-paint-${idPrefix}-${id}`;
  const clipIdFor = (id: string): string => `retikz-clip-${idPrefix}-${id}`;
  return {
    context: {
      arrowMarkerIdFor,
      paintRefUrl: (id: string) => `url(#${paintIdFor(id)})`,
      clipRefUrl: (id: string) => `url(#${clipIdFor(id)})`,
    },
    arrowMarkerIdFor,
    paintIdFor,
    clipIdFor,
  };
};

/** 收集 + 按 stableSpecKey dedup arrow 端点 spec（保持首次出现顺序） */
const dedupArrowSpecs = (prims: ReadonlyArray<ScenePrimitive>): Map<string, ArrowEndSpec> => {
  const uniqueByKey = new Map<string, ArrowEndSpec>();
  for (const s of collectArrowSpecs(prims)) {
    const k = stableSpecKey(s);
    if (!uniqueByKey.has(k)) uniqueByKey.set(k, s);
  }
  return uniqueByKey;
};

/** 组装 `<defs>` 子节点（arrow marker → paint → clip）；无任何资源时返回 undefined（不产空 `<defs>`） */
const buildDefs = (scene: Scene, idPrefix: string): SvgNode | undefined => {
  const { arrowMarkerIdFor, paintIdFor, clipIdFor } = makeContext(idPrefix);
  const uniqueByKey = dedupArrowSpecs(scene.primitives);
  const resources = scene.resources ?? [];
  const paintResources = resources.filter(r => r.kind === 'paint');
  const clipResources = resources.filter(r => r.kind === 'clip');
  if (uniqueByKey.size === 0 && paintResources.length === 0 && clipResources.length === 0) {
    return undefined;
  }
  const children: Array<SvgNode> = [];
  for (const spec of uniqueByKey.values()) {
    children.push(buildArrowMarker(arrowMarkerIdFor(spec), spec));
  }
  for (const r of paintResources) children.push(buildPaintDef(r, paintIdFor(r.id)));
  for (const r of clipResources) children.push(buildClipDef(r, clipIdFor(r.id)));
  return { tag: 'defs', attrs: {}, children };
};

/**
 * Scene → SVG 内容子树（`<defs>` + primitives，无 `<svg>` 外壳）
 * @description 给 Vanilla `mountSvg` 往已有容器塞、或需要自定义 `<svg>` 外壳的 caller 用。
 */
export const buildSvgFragment = (
  scene: Scene,
  options: BuildDocumentOptions,
): Array<SvgNode> => {
  const { context } = makeContext(options.idPrefix);
  const defs = buildDefs(scene, options.idPrefix);
  const prims = scene.primitives
    .filter((p): p is ScenePrimitive => Boolean(p))
    .map(p => buildPrim(p, context));
  return defs ? [defs, ...prims] : prims;
};

/**
 * Scene → 整棵 `<svg>` 描述树（含 viewBox + `<defs>` + primitives）
 * @description `@retikz/render/svg` 的核心总装入口。width / height / className / 框架级 style 等 svg 元素附加由
 *   framework adapter 自理（非本包职责）。
 */
export const buildSvgDocument = (scene: Scene, options: BuildDocumentOptions): SvgNode => ({
  tag: 'svg',
  attrs: { viewBox: formatViewBox(scene.layout) },
  children: buildSvgFragment(scene, options),
});
