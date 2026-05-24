import type { Key, ReactElement } from 'react';
import type { ArrowEndSpec, PaintValue, ScenePrimitive } from '@retikz/core';
import { buildPathD } from './path-d-builder';
import { buildTransform } from './transform-builder';

type DominantBaseline =
  | 'text-before-edge'
  | 'central'
  | 'text-after-edge'
  | 'alphabetic';

/** Scene 的 align 与 SVG textAnchor 同名同义，仅在此做类型收窄 */
const alignToAnchor = (
  align: 'start' | 'middle' | 'end',
): 'start' | 'middle' | 'end' => align;

/** Scene baseline 名映射到 SVG dominantBaseline 枚举（top/middle/bottom 对应三种边界基线） */
const baselineToDominant = (
  b: 'top' | 'middle' | 'bottom' | 'alphabetic',
): DominantBaseline => {
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
 * 渲染上下文——TikZ 容器侧把 marker id 等"全 SVG 共享"的资源向下传给 renderPrim
 * @description 资源缺省时传 undefined，对应 path prim 不会引用 marker
 */
export type RenderContext = {
  /** 按 arrow 端点 spec 查 SVG `<defs><marker id>` id 的回调（按 detail hash 区分起末异形 / 异色） */
  arrowMarkerIdFor?: (spec: ArrowEndSpec) => string;
  /** paint 资源 id → SVG `url(#...)` 引用（Layout 加 useId 前缀避免跨实例撞）；缺省 `url(#id)` */
  paintRefUrl?: (id: string) => string;
  /** clip 资源 id → SVG `url(#...)` 引用（GroupPrim.clipRef 物化用，Layout 加 useId 前缀）；缺省 `url(#id)` */
  clipRefUrl?: (id: string) => string;
};

/**
 * PaintValue → SVG fill attribute / inline style
 * @description string 纯色：含 `var(` 走 style（attribute 不解析 CSS var）否则 attribute；`resourceRef` → `url(#...)`（adapter 物化 `<defs>`）；`contextStroke` → `context-stroke`（继承 path 描边）
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

/** 合并 fill（PaintValue 解析出的 var 值）+ stroke（含 var( 走 style）的 inline style */
const mergeFillStrokeStyle = (
  styleFill: string | undefined,
  stroke: string | undefined,
): { fill?: string; stroke?: string } | undefined => {
  const out: { fill?: string; stroke?: string } = {};
  if (styleFill !== undefined) out.fill = styleFill;
  if (stroke !== undefined && stroke.includes('var(')) out.stroke = stroke;
  return out.fill !== undefined || out.stroke !== undefined ? out : undefined;
};

/**
 * SVG attribute 与 inline style 的双路 paint：含 `var(...)` 的颜色值改走 style 字段（SVG attribute 不解析 CSS var）
 * @description SVG2 / CSS Color Module 规定 var() 只在 CSS 属性上下文里解析，作为 SVG 元素的 `fill` / `stroke` 等 attribute 值时不展开；想用 `var(--background)` 这种主题感知颜色必须落到 inline style。本 helper 把"含 var(" 的值挑出来塞 style.fill / style.stroke，剩下的走 attribute——既保留 attribute 的简洁，又让 var() 自动主题切换生效
 */
const paintAttr = (value: string | undefined): string | undefined =>
  value === undefined || value.includes('var(') ? undefined : value;
const paintStyle = (
  fill: string | undefined,
  stroke: string | undefined,
): { fill?: string; stroke?: string } | undefined => {
  const out: { fill?: string; stroke?: string } = {};
  if (fill !== undefined && fill.includes('var(')) out.fill = fill;
  if (stroke !== undefined && stroke.includes('var(')) out.stroke = stroke;
  return out.fill !== undefined || out.stroke !== undefined ? out : undefined;
};

/**
 * Scene primitive → SVG React 元素
 * @description 不读 IR，只读 Scene
 */
export const renderPrim = (
  p: ScenePrimitive,
  key: Key,
  context: RenderContext = {},
): ReactElement => {
  const paintRefUrl = context.paintRefUrl ?? ((id: string) => `url(#${id})`);
  switch (p.type) {
    case 'rect': {
      const f = fillToSvg(p.fill, paintRefUrl);
      return (
        <rect
          key={key}
          x={p.x}
          y={p.y}
          width={p.width}
          height={p.height}
          fill={f.attr}
          fillOpacity={p.fillOpacity}
          stroke={paintAttr(p.stroke)}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          rx={p.cornerRadius}
          ry={p.cornerRadius}
          opacity={p.opacity}
          style={mergeFillStrokeStyle(f.styleFill, p.stroke)}
        />
      );
    }
    case 'ellipse': {
      const transform = p.rotate ? `rotate(${p.rotate} ${p.cx} ${p.cy})` : undefined;
      const f = fillToSvg(p.fill, paintRefUrl);
      return (
        <ellipse
          key={key}
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          transform={transform}
          fill={f.attr}
          fillOpacity={p.fillOpacity}
          stroke={paintAttr(p.stroke)}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          opacity={p.opacity}
          style={mergeFillStrokeStyle(f.styleFill, p.stroke)}
        />
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
      return (
        <text
          key={key}
          x={p.x}
          y={p.y}
          fontSize={p.fontSize}
          fontFamily={p.fontFamily}
          fontWeight={p.fontWeight}
          fontStyle={p.fontStyle}
          textAnchor={alignToAnchor(p.align)}
          dominantBaseline={baselineToDominant(p.baseline)}
          fill={paintAttr(p.fill)}
          opacity={p.opacity}
          style={paintStyle(p.fill, undefined)}
        >
          {p.lines.map((line, i) => (
            <tspan
              key={i}
              x={p.x}
              dy={i === 0 ? firstDy : p.lineHeight}
              fill={paintAttr(line.fill)}
              opacity={line.opacity}
              fontSize={line.fontSize}
              fontFamily={line.fontFamily}
              fontWeight={line.fontWeight}
              fontStyle={line.fontStyle}
              style={paintStyle(line.fill, undefined)}
            >
              {line.text}
            </tspan>
          ))}
        </text>
      );
    }
    case 'path': {
      const startId =
        p.arrowStart && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowStart) : undefined;
      const endId =
        p.arrowEnd && context.arrowMarkerIdFor ? context.arrowMarkerIdFor(p.arrowEnd) : undefined;
      const f = fillToSvg(p.fill, paintRefUrl);
      return (
        <path
          key={key}
          d={buildPathD(p.commands)}
          fill={f.attr}
          fillOpacity={p.fillOpacity}
          fillRule={p.fillRule}
          stroke={paintAttr(p.stroke)}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          strokeLinecap={p.strokeLinecap}
          strokeLinejoin={p.strokeLinejoin}
          markerStart={startId ? `url(#${startId})` : undefined}
          markerEnd={endId ? `url(#${endId})` : undefined}
          opacity={p.opacity}
          style={mergeFillStrokeStyle(f.styleFill, p.stroke)}
        />
      );
    }
    case 'group': {
      const clipRefUrl = context.clipRefUrl ?? ((id: string) => `url(#${id})`);
      const clipPath = p.clipRef !== undefined ? clipRefUrl(p.clipRef) : undefined;
      return (
        <g key={key} transform={buildTransform(p.transforms)} clipPath={clipPath}>
          {p.children.map((c, i) => renderPrim(c, i, context))}
        </g>
      );
    }
  }
};
