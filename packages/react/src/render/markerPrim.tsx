import type { ReactElement } from 'react';
import type { MarkerFill, MarkerPathCommand, MarkerPrimitive } from '@retikz/core';
import { buildPathD } from './path-d-builder';

/**
 * `MarkerPrimitive`（renderer-agnostic 窄子集几何）→ SVG 元素
 * @description core compile 把 emit 几何解析进 `ArrowEndSpec.marker`（arrow marker）或
 *   `ResolvedPatternTile.motif`（pattern motif）——两者同 `MarkerPrimitive` 窄子集，故共用本物化函数。
 *   独立非组件模块（不放进任何含 `<Component>` 导出的文件），让 arrow / pattern 物化都能 import 复用，
 *   且不触发 react-refresh 的 only-export-components 限制。
 */

/**
 * marker fill 取值 → SVG fill 属性
 * @description 纯色字符串直传；`{ kind:'contextStroke' }` → SVG `context-stroke`（继承所在元素描边，主题反应）；
 *   省略（hollow 几何无 fill）→ `none`（SVG `<path>` 缺省填黑，空心几何必须显式置 `none`）。
 */
const markerFillToSvg = (fill: MarkerFill | undefined): string => {
  if (fill === undefined) return 'none';
  if (typeof fill === 'string') return fill;
  return 'context-stroke';
};

/**
 * marker-local path 命令序列 → SVG `d` 字符串
 * @description 复用主 path 的 `buildPathD`（move/line/quad/cubic/close + arc/ellipseArc 走 SVG A 段）；
 *   `MarkerPathCommand` 与 Scene `PathCommand` 同词汇，结构兼容直接复用，避免两套 d 翻译漂移。
 */
const markerCommandsToD = (commands: ReadonlyArray<MarkerPathCommand>): string =>
  buildPathD(commands);

/**
 * 单个 `MarkerPrimitive` → SVG 元素（arrow marker / pattern motif 共用物化）
 * @description core 已在 compile 把 emit 几何解析成纯数据；react 只翻成 SVG。group 递归；
 *   fill 走 `markerFillToSvg`（contextStroke → context-stroke）。
 */
export const renderMarkerPrim = (prim: MarkerPrimitive, key: number): ReactElement => {
  switch (prim.type) {
    case 'path':
      return (
        <path
          key={key}
          d={markerCommandsToD(prim.commands)}
          fill={markerFillToSvg(prim.fill)}
          fillOpacity={prim.fillOpacity}
          fillRule={prim.fillRule}
          stroke={prim.stroke}
          strokeOpacity={prim.strokeOpacity}
          strokeWidth={prim.strokeWidth}
          strokeDasharray={prim.dashPattern?.join(' ')}
          strokeLinecap={prim.strokeLinecap}
          strokeLinejoin={prim.strokeLinejoin}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          key={key}
          cx={prim.cx}
          cy={prim.cy}
          rx={prim.rx}
          ry={prim.ry}
          fill={markerFillToSvg(prim.fill)}
          fillOpacity={prim.fillOpacity}
          stroke={prim.stroke}
          strokeOpacity={prim.strokeOpacity}
          strokeWidth={prim.strokeWidth}
          strokeDasharray={prim.dashPattern?.join(' ')}
          transform={prim.rotate ? `rotate(${prim.rotate} ${prim.cx} ${prim.cy})` : undefined}
        />
      );
    case 'rect':
      return (
        <rect
          key={key}
          x={prim.x}
          y={prim.y}
          width={prim.width}
          height={prim.height}
          rx={prim.cornerRadius}
          ry={prim.cornerRadius}
          fill={markerFillToSvg(prim.fill)}
          fillOpacity={prim.fillOpacity}
          stroke={prim.stroke}
          strokeOpacity={prim.strokeOpacity}
          strokeWidth={prim.strokeWidth}
          strokeDasharray={prim.dashPattern?.join(' ')}
        />
      );
    case 'group':
      return (
        <g key={key}>
          {prim.children.map((child, i) => renderMarkerPrim(child, i))}
        </g>
      );
  }
};
