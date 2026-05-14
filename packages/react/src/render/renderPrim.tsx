import type { Key, ReactElement } from 'react';
import type { ArrowEndSpec, ScenePrimitive } from '@retikz/core';
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
  switch (p.type) {
    case 'rect':
      return (
        <rect
          key={key}
          x={p.x}
          y={p.y}
          width={p.width}
          height={p.height}
          fill={p.fill}
          fillOpacity={p.fillOpacity}
          stroke={p.stroke}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          rx={p.cornerRadius}
          ry={p.cornerRadius}
          opacity={p.opacity}
        />
      );
    case 'ellipse': {
      const transform = p.rotate ? `rotate(${p.rotate} ${p.cx} ${p.cy})` : undefined;
      return (
        <ellipse
          key={key}
          cx={p.cx}
          cy={p.cy}
          rx={p.rx}
          ry={p.ry}
          transform={transform}
          fill={p.fill}
          fillOpacity={p.fillOpacity}
          stroke={p.stroke}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          opacity={p.opacity}
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
          fill={p.fill}
          opacity={p.opacity}
        >
          {p.lines.map((line, i) => (
            <tspan
              key={i}
              x={p.x}
              dy={i === 0 ? firstDy : p.lineHeight}
              fill={line.fill}
              opacity={line.opacity}
              fontSize={line.fontSize}
              fontFamily={line.fontFamily}
              fontWeight={line.fontWeight}
              fontStyle={line.fontStyle}
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
      return (
        <path
          key={key}
          d={buildPathD(p.commands)}
          fill={p.fill}
          fillOpacity={p.fillOpacity}
          fillRule={p.fillRule}
          stroke={p.stroke}
          strokeOpacity={p.strokeOpacity}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.dashPattern?.join(' ')}
          strokeLinecap={p.strokeLinecap}
          strokeLinejoin={p.strokeLinejoin}
          markerStart={startId ? `url(#${startId})` : undefined}
          markerEnd={endId ? `url(#${endId})` : undefined}
          opacity={p.opacity}
        />
      );
    }
    case 'group':
      return (
        <g key={key} transform={buildTransform(p.transforms)}>
          {p.children.map((c, i) => renderPrim(c, i, context))}
        </g>
      );
  }
};
