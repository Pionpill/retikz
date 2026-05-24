import type { FC, ReactElement } from 'react';
import type { ClipShape, SceneResource } from '@retikz/core';

/** 一个裁剪区几何 → `<clipPath>` 内的形状子元素 */
const renderClipShape = (shape: ClipShape): ReactElement => {
  switch (shape.kind) {
    case 'rect':
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case 'ellipse':
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
    case 'polygon':
      return <polygon points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')} />;
  }
};

/**
 * 物化 Scene 的 clip 资源成 `<clipPath>`（按 kind 分流，只取 clip 资源）
 * @description 与 `PaintDefs` 并列、同挂 `<defs>`：每个 `{ kind:'clip' }` 资源产一个 `<clipPath id>`，
 *   内含 rect / circle / ellipse / polygon 形状子元素；非 clip 资源（paint）跳过（返回 null）。
 *   id 经 `idFor` 加实例前缀避免跨 SVG 撞；`GroupPrim.clipRef` 经 `clipRefUrl` 引用同一 id。
 */
export const ClipDefs: FC<{ resources: Array<SceneResource>; idFor: (id: string) => string }> = ({
  resources,
  idFor,
}) => (
  <>
    {resources.map(r =>
      r.kind === 'clip' ? (
        <clipPath key={r.id} id={idFor(r.id)}>
          {renderClipShape(r.shape)}
        </clipPath>
      ) : null,
    )}
  </>
);
