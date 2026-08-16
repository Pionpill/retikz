import type { BlendModeValue, IRDropShadow, PaintValue, ResolvedArrowEnd, ScenePrimitive } from '@retikz/core';

import type { SvgNode, SvgStyle } from '../types';

import { firstLineDy } from '../../shared';
import { buildPathD } from '../path-d-builder';
import { buildTransform } from '../transform-builder';
import { compact } from './attrs';
import { shadowHash } from './shadow-defs';

type DominantBaseline = 'text-before-edge' | 'central' | 'text-after-edge' | 'alphabetic';

/**
 * builder 上下文——容器侧把「全 SVG 共享」的资源 id 回调向下传给 buildPrim
 * @description 资源缺省时回退裸 `url(#id)`（无实例前缀）；arrow marker 缺省不引用
 */
export type BuildContext = {
  /** 按 arrow 端点 spec 查 `<marker id>` id 的回调（按 detail hash 区分起末异形 / 异色） */
  arrowMarkerIdFor?: (spec: ResolvedArrowEnd) => string;
  /** paint 资源 id → `url(#...)` 引用（加实例前缀避免跨实例撞）；缺省 `url(#id)` */
  paintRefUrl?: (id: string) => string;
  /** clip 资源 id → `url(#...)` 引用（GroupPrim.clipRef 物化用）；缺省 `url(#id)` */
  clipRefUrl?: (id: string) => string;
  /** 按已解析 IRDropShadow 查去重注册的 `<filter>` id（emit `filter="url(#id)"`）；缺省裸 hash id */
  shadowIdFor?: (shadow: IRDropShadow) => string;
  /** 动画装饰回调（document builder 在动画启用时注入）：给带 `animations` 的 prim 挂 CSS / WAAPI；缺省不装饰 */
  decorate?: (node: SvgNode, prim: ScenePrimitive) => SvgNode;
};

/** Scene baseline 名 → SVG dominantBaseline 枚举（top/middle/bottom 对应三种边界基线） */
const baselineToDominant = (b: 'top' | 'middle' | 'bottom' | 'alphabetic'): DominantBaseline => {
  switch (b) {
    case 'top':
      return 'text-before-edge';
    case 'middle':
      return 'central';
    case 'bottom':
      return 'text-after-edge';
    case 'alphabetic':
      return 'alphabetic';
  }
};

/**
 * PaintValue → SVG paint attribute / inline style 值
 * @description string 纯色：含 `var(` 走 style（attribute 不解析 CSS var）否则 attribute；`resourceRef` →
 *   `url(#...)`；`contextStroke` → `context-stroke`（继承 path 描边）
 */
const paintToSvg = (
  paint: PaintValue | undefined,
  paintRefUrl: (id: string) => string,
): { attr: string | undefined; stylePaint: string | undefined } => {
  if (paint === undefined) return { attr: undefined, stylePaint: undefined };
  if (typeof paint === 'string') {
    return paint.includes('var(') ? { attr: undefined, stylePaint: paint } : { attr: paint, stylePaint: undefined };
  }
  if (paint.kind === 'resourceRef') return { attr: paintRefUrl(paint.id), stylePaint: undefined };
  return { attr: 'context-stroke', stylePaint: undefined };
};

/**
 * SVG attribute 与 inline style 的双路 paint：含 `var(...)` 的颜色值改走 style（SVG attribute 不解析 CSS var）
 * @description SVG2 / CSS Color Module 规定 var() 只在 CSS 属性上下文解析，作为 SVG attribute 值时不展开；
 *   想用 `var(--background)` 这类主题感知颜色必须落 inline style
 */
const paintAttr = (value: string | undefined): string | undefined =>
  value === undefined || value.includes('var(') ? undefined : value;

/** 合并 fill / stroke（PaintValue 解析出的 var 值）的 inline style */
const mergeFillStrokeStyle = (styleFill: string | undefined, styleStroke: string | undefined): SvgStyle | undefined => {
  const out: SvgStyle = {};
  if (styleFill !== undefined) out.fill = styleFill;
  if (styleStroke !== undefined) out.stroke = styleStroke;
  return out.fill !== undefined || out.stroke !== undefined ? out : undefined;
};

/** text / tspan 专用：fill（含 var( 走 style）的 inline style */
const fillOnlyStyle = (fill: string | undefined): SvgStyle | undefined =>
  fill !== undefined && fill.includes('var(') ? { fill } : undefined;

/** 给 SvgNode 可选挂 style（仅在有值时写 style 字段，保持节点干净） */
const withStyle = (node: SvgNode, style: SvgStyle | undefined): SvgNode => (style ? { ...node, style } : node);

/**
 * 把可选 blendMode 合进（可能已含 fill/stroke 的）几何图元 style
 * @description `normal` / 省略不出 `mix-blend-mode`（逐字不变）；其余 emit CSS `mix-blend-mode`，与 var() 颜色共存
 */
const mergeBlendStyle = (style: SvgStyle | undefined, blendMode: BlendModeValue | undefined): SvgStyle | undefined => {
  if (blendMode === undefined || blendMode === 'normal') return style;
  return { ...(style ?? {}), 'mix-blend-mode': blendMode };
};

/**
 * IRDropShadow → `filter="url(#id)"` 值
 * @description 缺省 `shadowIdFor`（粒度化调用 `buildPrim` 而非走整文档装配）时回退到「内容寻址」裸 id
 *   `retikz-shadow-<hash>`（同 paint / clip 回退口径：不带实例前缀的稳定 id）。这样独立调用方只要自行用同口径
 *   emit 对应 `<filter>` def，引用即生效；不同 shadow 得不同 hash（不会塌成一个 id）。整文档路径恒由
 *   `context.shadowIdFor` 注入带前缀 id 并配套 defs
 */
const shadowFilterRef = (
  shadow: IRDropShadow | undefined,
  shadowIdFor: ((shadow: IRDropShadow) => string) | undefined,
): string | undefined =>
  shadow ? `url(#${shadowIdFor ? shadowIdFor(shadow) : `retikz-shadow-${shadowHash(shadow)}`})` : undefined;

/**
 * Scene primitive → `SvgNode`
 * @description 不读 IR，只读 Scene。属性名一律 SVG 真名（呈现属性 kebab、结构属性规范拼写）；含 `var()` 的
 *   颜色值落 `style`、其余落 `attrs`。group 递归并跳过 undefined 子槽位（防御非法 Scene）
 */
const buildPrimRaw = (p: ScenePrimitive, context: BuildContext): SvgNode => {
  const paintRefUrl = context.paintRefUrl ?? ((id: string) => `url(#${id})`);
  switch (p.type) {
    case 'rect': {
      const f = paintToSvg(p.fill, paintRefUrl);
      const s = paintToSvg(p.stroke, paintRefUrl);
      return withStyle(
        {
          tag: 'rect',
          attrs: compact({
            'data-retikz-id': p.id,
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            fill: f.attr,
            'fill-opacity': p.fillOpacity,
            stroke: s.attr,
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            'stroke-dashoffset': p.dashOffset,
            rx: p.cornerRadius,
            ry: p.cornerRadius,
            opacity: p.opacity,
            filter: shadowFilterRef(p.shadow, context.shadowIdFor),
          }),
        },
        mergeBlendStyle(mergeFillStrokeStyle(f.stylePaint, s.stylePaint), p.blendMode),
      );
    }
    case 'ellipse': {
      const transform = p.rotate ? `rotate(${p.rotate} ${p.cx} ${p.cy})` : undefined;
      const f = paintToSvg(p.fill, paintRefUrl);
      const s = paintToSvg(p.stroke, paintRefUrl);
      return withStyle(
        {
          tag: 'ellipse',
          attrs: compact({
            'data-retikz-id': p.id,
            cx: p.cx,
            cy: p.cy,
            rx: p.rx,
            ry: p.ry,
            transform,
            fill: f.attr,
            'fill-opacity': p.fillOpacity,
            stroke: s.attr,
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            'stroke-dashoffset': p.dashOffset,
            opacity: p.opacity,
            filter: shadowFilterRef(p.shadow, context.shadowIdFor),
          }),
        },
        mergeBlendStyle(mergeFillStrokeStyle(f.stylePaint, s.stylePaint), p.blendMode),
      );
    }
    case 'text': {
      // 多行块整体垂直对齐：首行 dy 由 firstLineDy 据 baseline 推算（与 Canvas 共用），其余行逐行 lineHeight
      const firstDy = firstLineDy(p);
      const children: Array<SvgNode> = p.lines.map((line, i) =>
        withStyle(
          {
            tag: 'tspan',
            attrs: compact({
              x: p.x,
              dy: i === 0 ? firstDy : p.lineHeight,
              fill: paintAttr(line.fill),
              // 浏览器对 <tspan> 不应用 opacity（非渲染组），用 fill-opacity 才能真正生效（Canvas 端经 globalAlpha 等效）
              'fill-opacity': line.opacity,
              'font-size': line.fontSize,
              'font-family': line.fontFamily,
              'font-weight': line.fontWeight,
              'font-style': line.fontStyle,
            }),
            children: [line.text],
          },
          fillOnlyStyle(line.fill),
        ),
      );
      return withStyle(
        {
          tag: 'text',
          attrs: compact({
            'data-retikz-id': p.id,
            x: p.x,
            y: p.y,
            'font-size': p.fontSize,
            'font-family': p.fontFamily,
            'font-weight': p.fontWeight,
            'font-style': p.fontStyle,
            'text-anchor': p.align,
            'dominant-baseline': baselineToDominant(p.baseline),
            fill: paintAttr(p.fill),
            opacity: p.opacity,
          }),
          children,
        },
        fillOnlyStyle(p.fill),
      );
    }
    case 'path': {
      const startId = p.arrowStart && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowStart) : undefined;
      const endId = p.arrowEnd && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowEnd) : undefined;
      const f = paintToSvg(p.fill, paintRefUrl);
      const s = paintToSvg(p.stroke, paintRefUrl);
      return withStyle(
        {
          tag: 'path',
          attrs: compact({
            'data-retikz-id': p.id,
            d: buildPathD(p.commands),
            fill: f.attr,
            'fill-opacity': p.fillOpacity,
            'fill-rule': p.fillRule,
            stroke: s.attr,
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            'stroke-dashoffset': p.dashOffset,
            'stroke-linecap': p.strokeLinecap,
            'stroke-linejoin': p.strokeLinejoin,
            'marker-start': startId ? `url(#${startId})` : undefined,
            'marker-end': endId ? `url(#${endId})` : undefined,
            opacity: p.opacity,
            filter: shadowFilterRef(p.shadow, context.shadowIdFor),
          }),
        },
        mergeBlendStyle(mergeFillStrokeStyle(f.stylePaint, s.stylePaint), p.blendMode),
      );
    }
    case 'group': {
      const clipRefUrl = context.clipRefUrl ?? ((id: string) => `url(#${id})`);
      const clipPath = p.clipRef !== undefined ? clipRefUrl(p.clipRef) : undefined;
      // 防御：跳过 undefined 子槽位（非法 Scene 不致抛）
      const children = p.children.filter((c): c is ScenePrimitive => Boolean(c)).map(c => buildPrim(c, context));
      return {
        tag: 'g',
        attrs: compact({
          'data-retikz-id': p.id,
          transform: buildTransform(p.transforms),
          'clip-path': clipPath,
        }),
        children,
      };
    }
  }
};

/**
 * Scene primitive → `SvgNode`（含动画装饰）
 * @description 先建静态 base 节点（buildPrimRaw），再经 context.decorate 挂动画（CSS class / WAAPI data /
 *   transform wrapper `<g>`）；无 decorate（动画关闭或无 animations）时原样返回 base
 */
export const buildPrim = (p: ScenePrimitive, context: BuildContext = {}): SvgNode => {
  const node = buildPrimRaw(p, context);
  return context.decorate ? context.decorate(node, p) : node;
};
