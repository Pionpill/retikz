import type { ArrowEndSpec, PaintValue, ScenePrimitive } from '@retikz/core';
import type { SvgNode, SvgStyle } from '../types';
import { buildPathD } from '../path-d-builder';
import { buildTransform } from '../transform-builder';
import { compact } from './attrs';

type DominantBaseline = 'text-before-edge' | 'central' | 'text-after-edge' | 'alphabetic';

/**
 * builder 上下文——容器侧把「全 SVG 共享」的资源 id 回调向下传给 buildPrim
 * @description 资源缺省时回退裸 `url(#id)`（无实例前缀）；arrow marker 缺省不引用。
 */
export type BuildContext = {
  /** 按 arrow 端点 spec 查 `<marker id>` id 的回调（按 detail hash 区分起末异形 / 异色） */
  arrowMarkerIdFor?: (spec: ArrowEndSpec) => string;
  /** paint 资源 id → `url(#...)` 引用（加实例前缀避免跨实例撞）；缺省 `url(#id)` */
  paintRefUrl?: (id: string) => string;
  /** clip 资源 id → `url(#...)` 引用（GroupPrim.clipRef 物化用）；缺省 `url(#id)` */
  clipRefUrl?: (id: string) => string;
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
 * PaintValue → SVG fill attribute / inline style 值
 * @description string 纯色：含 `var(` 走 style（attribute 不解析 CSS var）否则 attribute；`resourceRef` →
 *   `url(#...)`；`contextStroke` → `context-stroke`（继承 path 描边）。
 */
const fillToSvg = (
  fill: PaintValue | undefined,
  paintRefUrl: (id: string) => string,
): { attr: string | undefined; styleFill: string | undefined } => {
  if (fill === undefined) return { attr: undefined, styleFill: undefined };
  if (typeof fill === 'string') {
    return fill.includes('var(')
      ? { attr: undefined, styleFill: fill }
      : { attr: fill, styleFill: undefined };
  }
  if (fill.kind === 'resourceRef') return { attr: paintRefUrl(fill.id), styleFill: undefined };
  return { attr: 'context-stroke', styleFill: undefined };
};

/**
 * SVG attribute 与 inline style 的双路 paint：含 `var(...)` 的颜色值改走 style（SVG attribute 不解析 CSS var）
 * @description SVG2 / CSS Color Module 规定 var() 只在 CSS 属性上下文解析，作为 SVG attribute 值时不展开；
 *   想用 `var(--background)` 这类主题感知颜色必须落 inline style。
 */
const paintAttr = (value: string | undefined): string | undefined =>
  value === undefined || value.includes('var(') ? undefined : value;

/** 合并 fill（PaintValue 解析出的 var 值）+ stroke（含 var( 走 style）的 inline style */
const mergeFillStrokeStyle = (
  styleFill: string | undefined,
  stroke: string | undefined,
): SvgStyle | undefined => {
  const out: SvgStyle = {};
  if (styleFill !== undefined) out.fill = styleFill;
  if (stroke !== undefined && stroke.includes('var(')) out.stroke = stroke;
  return out.fill !== undefined || out.stroke !== undefined ? out : undefined;
};

/** text / tspan 专用：fill（含 var( 走 style）的 inline style */
const fillOnlyStyle = (fill: string | undefined): SvgStyle | undefined =>
  fill !== undefined && fill.includes('var(') ? { fill } : undefined;

/** 给 SvgNode 可选挂 style（仅在有值时写 style 字段，保持节点干净） */
const withStyle = (node: SvgNode, style: SvgStyle | undefined): SvgNode =>
  style ? { ...node, style } : node;

/**
 * Scene primitive → `SvgNode`
 * @description 不读 IR，只读 Scene。属性名一律 SVG 真名（呈现属性 kebab、结构属性规范拼写）；含 `var()` 的
 *   颜色值落 `style`、其余落 `attrs`。group 递归并跳过 undefined 子槽位（防御非法 Scene）。
 */
export const buildPrim = (p: ScenePrimitive, context: BuildContext = {}): SvgNode => {
  const paintRefUrl = context.paintRefUrl ?? ((id: string) => `url(#${id})`);
  switch (p.type) {
    case 'rect': {
      const f = fillToSvg(p.fill, paintRefUrl);
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
            stroke: paintAttr(p.stroke),
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            rx: p.cornerRadius,
            ry: p.cornerRadius,
            opacity: p.opacity,
          }),
        },
        mergeFillStrokeStyle(f.styleFill, p.stroke),
      );
    }
    case 'ellipse': {
      const transform = p.rotate ? `rotate(${p.rotate} ${p.cx} ${p.cy})` : undefined;
      const f = fillToSvg(p.fill, paintRefUrl);
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
            stroke: paintAttr(p.stroke),
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            opacity: p.opacity,
          }),
        },
        mergeFillStrokeStyle(f.styleFill, p.stroke),
      );
    }
    case 'text': {
      // 多行块整体垂直对齐：把首行 dy 推算成块在 (x, y) 上正确 baseline 对齐
      // middle: 中心对齐 → 首行上推 (n-1)/2 × lineHeight
      // top / alphabetic: 块顶对齐 → 首行 dy=0
      // bottom: 块底对齐 → 首行上推 (n-1) × lineHeight
      const n = p.lines.length;
      const firstDy =
        p.baseline === 'middle'
          ? (-(n - 1) / 2) * p.lineHeight
          : p.baseline === 'bottom'
            ? -(n - 1) * p.lineHeight
            : 0;
      const children: Array<SvgNode> = p.lines.map((line, i) =>
        withStyle(
          {
            tag: 'tspan',
            attrs: compact({
              x: p.x,
              dy: i === 0 ? firstDy : p.lineHeight,
              fill: paintAttr(line.fill),
              opacity: line.opacity,
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
      const startId =
        p.arrowStart && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowStart) : undefined;
      const endId =
        p.arrowEnd && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowEnd) : undefined;
      const f = fillToSvg(p.fill, paintRefUrl);
      return withStyle(
        {
          tag: 'path',
          attrs: compact({
            'data-retikz-id': p.id,
            d: buildPathD(p.commands),
            fill: f.attr,
            'fill-opacity': p.fillOpacity,
            'fill-rule': p.fillRule,
            stroke: paintAttr(p.stroke),
            'stroke-opacity': p.strokeOpacity,
            'stroke-width': p.strokeWidth,
            'stroke-dasharray': p.dashPattern?.join(' '),
            'stroke-linecap': p.strokeLinecap,
            'stroke-linejoin': p.strokeLinejoin,
            'marker-start': startId ? `url(#${startId})` : undefined,
            'marker-end': endId ? `url(#${endId})` : undefined,
            opacity: p.opacity,
          }),
        },
        mergeFillStrokeStyle(f.styleFill, p.stroke),
      );
    }
    case 'group': {
      const clipRefUrl = context.clipRefUrl ?? ((id: string) => `url(#${id})`);
      const clipPath = p.clipRef !== undefined ? clipRefUrl(p.clipRef) : undefined;
      // 防御：跳过 undefined 子槽位（非法 Scene 不致抛）
      const children = p.children
        .filter((c): c is ScenePrimitive => Boolean(c))
        .map(c => buildPrim(c, context));
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
