import type { PaintValue, Scene, ScenePrimitive } from '@retikz/core';

import type { StaticRenderFrame } from '../../runtime';
import { EMPTY_READONLY_LAYERS, validateReadonlyLayers } from '../../runtime';
import { resolveSceneResourceMap } from '../../shared';
import { countScenePrimitiveOccurrences, startArrowPlacement, endArrowPlacement } from '../../shared';
import type { RenderTraceReporter } from '../../trace';
import { RenderTracePhase, RenderTraceUnit } from '../../trace';
import { createSvgAnimationCollector } from '../animation';
import { toSafeSvgToken } from '../safe-token';
import type { SvgNode } from '../types';
import { formatViewBox } from '../view-box';
import { buildClipDef } from './clip-defs';
import { buildPaintDef } from './paint-defs';
import type { BuildContext } from './prim';
import { buildPrim } from './prim';
import { buildSvgReadonlyLayer } from './readonly-layer';
import { buildShadowDef, shadowHash } from './shadow-defs';

/** `buildSvgDocument` / `buildSvgFragment` 选项 */
export type BuildDocumentOptions = {
  /**
   * id 前缀——所有 `<defs>` 资源 id（marker / paint / clip）与对应 `url(#...)` 引用共用此前缀确保唯一
   * @description 同 scene + 同 idPrefix → 逐字一致的 id（水合前置）；不同 idPrefix → id 无交集（多实例隔离）。
   *   caller 注入（React 用剥冒号的 `useId()`；SSR / Vanilla 显式给）
   */
  idPrefix: string;
  /** 根 SVG 的默认字体族；文字自身指定的字体族优先 */
  defaultFontFamily?: string;
  /**
   * 是否产出动画（缺省 true）；`false` → 不 emit `<style>` / WAAPI 描述，渲染 base 静态图（settled 不变量）
   * @description runtime 据 `{animate:false}` / `prefers-reduced-motion` 走静态路径时传 false
   */
  animate?: boolean;
  /** 动画降级诊断告警（pathDraw 无描边 / 自定义 property 无映射 / 自定义 easing 未注册）；缺省 console.warn */
  onAnimationWarn?: (message: string) => void;
  /**
   * 静态截帧时刻（毫秒）；给定时不 emit 动画，而是把各 track 在该时刻的值**烘焙成静态属性 / transform**（定格一帧）
   * @description SSR 海报帧 / 缩略图 / 截图用。覆盖 `animate`（截帧本就是静态产物，复用 `evaluateTrack` 求值）
   */
  snapshotAt?: number;
  /** 记录完整 SVG document build 消费的 Scene primitive occurrence */
  trace?: RenderTraceReporter;
};

/**
 * Scene → SVG 内容子树（`<defs>` + primitives，无 `<svg>` 外壳）
 * @description 给 Vanilla `mountSvg` 往已有容器塞、或需要自定义 `<svg>` 外壳的 caller 用
 */
export const buildSvgFragment = (scene: Scene, options: BuildDocumentOptions): Array<SvgNode> => {
  const safeIdPrefix = toSafeSvgToken(options.idPrefix);
  const resources = resolveSceneResourceMap(scene);

  // 截帧（snapshotAt 给定）→ 烘焙静态帧的收集器；否则按 animate 决定动画收集器 / 无（base）
  const collector =
    options.snapshotAt !== undefined
      ? createSvgAnimationCollector({
          idPrefix: safeIdPrefix,

          onWarn: options.onAnimationWarn,
          snapshotAt: options.snapshotAt,
        })
      : options.animate === false
        ? undefined
        : createSvgAnimationCollector({
            idPrefix: safeIdPrefix,

            onWarn: options.onAnimationWarn,
          });
  const definitions = new Map<string, () => SvgNode>();
  const clipIdFor = (id: string): string => `retikz-clip-${safeIdPrefix}-${id}`;
  const contextFor = (hostId?: string, isResourceContent = false, contextStroke?: PaintValue): BuildContext => {
    const suffix = hostId === undefined ? '' : `-host-${toSafeSvgToken(hostId)}`;
    const resourceContext = (): BuildContext => contextFor(hostId, true, 'currentColor');
    return {
      hostId,
      contextStroke,
      isResourceContent,
      forPrimitive: isResourceContent ? undefined : primitive => contextFor(primitive.id ?? hostId),
      decorate: collector?.decorate,
      clipRefUrl: id => `url(#${clipIdFor(id)})`,
      arrowContentFor: primitive => {
        const children: Array<SvgNode> = [];
        for (const [spec, placement] of [
          [primitive.arrowStart, startArrowPlacement(primitive.commands)],
          [primitive.arrowEnd, endArrowPlacement(primitive.commands)],
        ] as const) {
          if (!spec || !placement) continue;
          const strokeWidth = primitive.strokeWidth ?? 1;
          const stroke =
            typeof primitive.stroke === 'object' && primitive.stroke.kind === 'contextStroke'
              ? contextStroke
              : primitive.stroke;
          children.push({
            tag: 'g',
            attrs: {
              transform: `translate(${placement.vertex[0]} ${placement.vertex[1]}) rotate(${(placement.angle * 180) / Math.PI}) scale(${(spec.markerWidth * strokeWidth) / spec.baseSize} ${(spec.markerHeight * strokeWidth) / spec.baseSize}) translate(${-spec.refX} ${-spec.baseSize / 2})`,
              ...(spec.opacity === undefined ? {} : { opacity: spec.opacity }),
            },
            children: spec.marker.map(child => buildPrim(child, contextFor(hostId, true, stroke ?? 'none'))),
          });
        }
        return children;
      },
      paintRefUrl: resourceId => {
        const resource = resources.get(resourceId);
        const id = `retikz-paint-${safeIdPrefix}-${resourceId}${resource?.kind === 'paint' && 'tile' in resource ? suffix : ''}`;
        if (resource?.kind === 'paint' && !definitions.has(id)) {
          definitions.set(id, () => buildPaintDef(resource, id, resourceContext()));
        }
        return `url(#${id})`;
      },
      shadowIdFor: shadow => {
        const id = `retikz-shadow-${safeIdPrefix}-${shadowHash(shadow)}`;
        if (!definitions.has(id)) definitions.set(id, () => buildShadowDef(shadow, id, scene.layout));
        return id;
      },
    };
  };
  const context = contextFor();
  for (const resource of resources.values()) {
    if (resource.kind === 'clip') {
      const id = clipIdFor(resource.id);
      definitions.set(id, () => buildClipDef(resource, id));
    }
  }
  let prims = scene.primitives.filter((p): p is ScenePrimitive => Boolean(p)).map(p => buildPrim(p, context));
  if (collector) prims = collector.wrapCamera(prims, scene);
  const definitionNodes: Array<SvgNode> = [];
  for (const build of definitions.values()) definitionNodes.push(build());
  const defs: SvgNode | undefined = definitionNodes.length
    ? { tag: 'defs', attrs: {}, children: definitionNodes }
    : undefined;
  const style = collector?.styleNode();

  // 顺序：<style>（动画）→ <defs>（资源）→ primitives
  const head: Array<SvgNode> = [];
  if (style) head.push(style);
  if (defs) head.push(defs);

  return [...head, ...prims];
};

/**
 * Scene → 整棵 `<svg>` 描述树（含 viewBox + `<defs>` + primitives）
 * @description `@retikz/render/svg` 的核心总装入口。width / height / className / 框架级 style 等 svg 元素附加由
 *   framework adapter 自理（非本包职责）
 */
export const buildSvgFrameDocument = (frame: StaticRenderFrame, options: BuildDocumentOptions): SvgNode => {
  const scene = frame.primary;
  const layers = validateReadonlyLayers(frame.layers);
  const document: SvgNode = {
    tag: 'svg',
    attrs: {
      viewBox: formatViewBox(scene.layout),
      ...(options.defaultFontFamily ? { 'font-family': options.defaultFontFamily } : {}),
    },
    children: [
      ...buildSvgFragment(scene, options),
      ...layers.map(layer =>
        buildSvgReadonlyLayer(
          layer,
          buildSvgFragment(layer.scene, {
            ...options,
            idPrefix: `${options.idPrefix}-layer-${layer.key}`,
            animate: false,
            trace: undefined,
          }),
        ),
      ),
    ],
  };
  if (options.trace !== undefined) {
    const visited = countScenePrimitiveOccurrences(scene.primitives);
    try {
      options.trace.report({
        phase: RenderTracePhase.Commit,
        unit: RenderTraceUnit.ScenePrimitive,
        outcome: 'full',
        visited,
        reused: 0,
        changed: visited,
      });
    } catch {
      /* 观测失败不影响绘制结果 */
    }
  }

  return document;
};

/** Scene → 整棵 `<svg>` 描述树，等价于使用空只读图层的静态 frame */
export const buildSvgDocument = (scene: Scene, options: BuildDocumentOptions): SvgNode =>
  buildSvgFrameDocument({ primary: scene, layers: EMPTY_READONLY_LAYERS }, options);
