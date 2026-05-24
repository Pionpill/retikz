import type { FC } from 'react';
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

const Stops: FC<{ spec: IRPaintSpec }> = ({ spec }) => (
  <>
    {spec.stops.map((s, i) => (
      <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
    ))}
  </>
);

/**
 * Scene paint 资源（gradient）→ SVG `<linearGradient>` / `<radialGradient>`
 * @description gradientUnits 用默认 objectBoundingBox（坐标 0..1 相对填充形状）；id 经 `idFor` 加实例前缀避免跨 SVG 撞
 */
export const PaintDefs: FC<{ resources: Array<SceneResource>; idFor: (id: string) => string }> = ({
  resources,
  idFor,
}) => (
  <>
    {/* 当前 SceneResource 仅 paint；alpha.9 加 clip 时这里按 kind 分流 */}
    {resources.map(r => {
      const { spec } = r;
      if (spec.type === 'linearGradient') {
        const l = angleToLine(spec.angle);
        return (
          <linearGradient key={r.id} id={idFor(r.id)} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}>
            <Stops spec={spec} />
          </linearGradient>
        );
      }
      const [cx, cy] = spec.center ?? [0.5, 0.5];
      return (
        <radialGradient key={r.id} id={idFor(r.id)} cx={cx} cy={cy} r={spec.radius ?? 0.5}>
          <Stops spec={spec} />
        </radialGradient>
      );
    })}
  </>
);
