import type { FC, ReactElement } from 'react';
import type { IRPaintSpec, SceneResource } from '@retikz/core';

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

/** 一个 paint 资源 → 对应 SVG paint server 元素（key = 物化后的 SVG id） */
const renderPaint = (spec: IRPaintSpec, id: string): ReactElement => {
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
    case 'pattern': {
      const size = spec.size ?? 8;
      const color = spec.color ?? 'currentColor';
      const stroke = spec.lineWidth ?? 1;
      const transform = spec.rotation ? `rotate(${spec.rotation})` : undefined;
      return (
        <pattern
          key={id}
          id={id}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          patternTransform={transform}
        >
          {spec.background !== undefined && <rect width={size} height={size} fill={spec.background} />}
          {spec.shape === 'lines' && <path d={`M0 0 H${size}`} stroke={color} strokeWidth={stroke} />}
          {spec.shape === 'grid' && (
            <path d={`M0 0 H${size} M0 0 V${size}`} stroke={color} strokeWidth={stroke} fill="none" />
          )}
          {spec.shape === 'dots' && (
            <circle cx={size / 2} cy={size / 2} r={spec.lineWidth ?? size / 5} fill={color} />
          )}
        </pattern>
      );
    }
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
    {/* 当前 SceneResource 仅 paint；alpha.9 加 clip 时这里按 kind 分流 */}
    {resources.map(r => renderPaint(r.spec, idFor(r.id)))}
  </>
);
