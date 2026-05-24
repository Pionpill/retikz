import type { FC, ReactElement } from 'react';
import type { IRPaintSpec, PaintResource, ResolvedPatternTile, SceneResource } from '@retikz/core';
import { renderMarkerPrim } from './markerPrim';

/**
 * 渐变角度（度，polar 约定 0=+x / 90=+y 屏幕下）→ objectBoundingBox 下的 x1/y1/x2/y2
 * @description 过中心 (0.5,0.5) 沿方向画长度 1 的渐变线；angle 缺省 0（左→右）。
 */
const angleToLine = (
  angle: number | undefined,
): { x1: number; y1: number; x2: number; y2: number } => {
  const rad = ((angle ?? 0) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return { x1: 0.5 - dx * 0.5, y1: 0.5 - dy * 0.5, x2: 0.5 + dx * 0.5, y2: 0.5 + dy * 0.5 };
};

const Stops: FC<{ spec: IRPaintSpec }> = ({ spec }) =>
  spec.type === 'linearGradient' || spec.type === 'radialGradient' ? (
    <>
      {spec.stops.map((s, i) => (
        <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
      ))}
    </>
  ) : null;

/** fit → SVG preserveAspectRatio（cover 为缺省） */
const fitToPAR = (fit: 'fill' | 'contain' | 'cover' | undefined): string =>
  fit === 'fill' ? 'none' : fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';

/**
 * 物化已解析 pattern tile（emit-in-compile 产物）成 `<pattern>`
 * @description 宽高 = `tile.size`、`patternUnits=userSpaceOnUse`（tile 固定 user units）、可选整体旋转；
 *   `tile.motif`（`MarkerPrimitive[]`，含可选背景 rect）复用 arrow 的 `renderMarkerPrim` 物化（contextStroke →
 *   context-stroke）。react 不再 switch motif shape、不算几何——几何全在 core compile 期产出。
 */
const renderPatternTile = (tile: ResolvedPatternTile, id: string): ReactElement => (
  <pattern
    key={id}
    id={id}
    width={tile.size}
    height={tile.size}
    patternUnits="userSpaceOnUse"
    patternTransform={tile.rotation ? `rotate(${tile.rotation})` : undefined}
  >
    {tile.motif.map((prim, i) => renderMarkerPrim(prim, i))}
  </pattern>
);

/** 一个 paint 资源 → 对应 SVG paint server 元素（key = 物化后的 SVG id） */
const renderPaint = (resource: PaintResource, id: string): ReactElement => {
  const spec: IRPaintSpec = resource.spec;
  switch (spec.type) {
    case 'linearGradient': {
      const l = angleToLine(spec.angle);
      return (
        <linearGradient key={id} id={id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}>
          <Stops spec={spec} />
        </linearGradient>
      );
    }
    case 'radialGradient': {
      const [cx, cy] = spec.center ?? [0.5, 0.5];
      return (
        <radialGradient key={id} id={id} cx={cx} cy={cy} r={spec.radius ?? 0.5}>
          <Stops spec={spec} />
        </radialGradient>
      );
    }
    case 'pattern':
      // pattern 资源带 compile 期已解析的 tile（motif 几何 + size + rotation）；缺 tile 是不该出现的 compile bug
      return resource.tile ? renderPatternTile(resource.tile, id) : <pattern key={id} id={id} />;
    case 'image':
      return (
        <pattern key={id} id={id} width={1} height={1} patternContentUnits="objectBoundingBox">
          <image href={spec.href} width={1} height={1} preserveAspectRatio={fitToPAR(spec.fit)} />
        </pattern>
      );
  }
};

/**
 * Scene paint 资源 → SVG paint server（gradient / pattern / image）
 * @description gradient / image 用 objectBoundingBox（随形状缩放）；pattern 用 userSpaceOnUse（tile 固定 user units）。
 *   id 经 `idFor` 加实例前缀避免跨 SVG 撞。
 */
export const PaintDefs: FC<{ resources: Array<SceneResource>; idFor: (id: string) => string }> = ({
  resources,
  idFor,
}) => (
  <>
    {/* 资源表按 kind 分流：只物化 paint 资源（clip 资源走 ClipDefs） */}
    {resources.map(r => (r.kind === 'paint' ? renderPaint(r, idFor(r.id)) : null))}
  </>
);
