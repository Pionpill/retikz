import type { Key, ReactElement } from 'react';
import type { ScenePrimitive } from '@retikz/core';

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
 * Scene primitive → SVG React 元素。
 * 不读 IR，只读 Scene；约束在 100 行以内（超过说明 Scene 抽象不够下沉，回 core 补）。
 */
export const renderPrim = (p: ScenePrimitive, key: Key): ReactElement => {
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
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.strokeDasharray}
          rx={p.cornerRadius}
          ry={p.cornerRadius}
          opacity={p.opacity}
        />
      );
    case 'text':
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
          {p.content}
        </text>
      );
    case 'path':
      return (
        <path
          key={key}
          d={p.d}
          fill={p.fill}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          strokeDasharray={p.strokeDasharray}
          strokeLinecap={p.strokeLinecap}
          strokeLinejoin={p.strokeLinejoin}
          opacity={p.opacity}
        />
      );
    case 'group':
      return (
        <g key={key} transform={p.transform}>
          {p.children.map((c, i) => renderPrim(c, i))}
        </g>
      );
  }
};
