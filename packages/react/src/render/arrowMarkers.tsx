import type { FC, ReactElement } from 'react';
import type {
  ArrowEndSpec,
  MarkerFill,
  MarkerPathCommand,
  MarkerPrimitive,
} from '@retikz/core';
import { buildPathD } from './path-d-builder';

/**
 * marker fill 取值 → SVG fill 属性
 * @description 纯色字符串直传；`{ kind:'contextStroke' }` → SVG `context-stroke`（继承所在元素描边，主题反应）；
 *   省略（hollow 几何无 fill）→ `none`（SVG `<path>` 缺省填黑，空心箭头必须显式置 `none`）。
 */
const markerFillToSvg = (fill: MarkerFill | undefined): string => {
  if (fill === undefined) return 'none';
  if (typeof fill === 'string') return fill;
  return 'context-stroke';
};

/**
 * marker-local path 命令序列 → SVG `d` 字符串
 * @description 复用主 path 的 `buildPathD`（move/line/quad/cubic/close + arc/ellipseArc 走 SVG A 段）；
 *   `MarkerPathCommand` 与 Scene `PathCommand` 同词汇，结构兼容直接复用，避免 marker 与主 path 两套 d 翻译漂移。
 */
const markerCommandsToD = (commands: ReadonlyArray<MarkerPathCommand>): string =>
  buildPathD(commands);

/**
 * 单个 `MarkerPrimitive` → SVG 元素（renderer-agnostic 几何的 react 物化）
 * @description core 已在 compile 把 def.emit 几何解析进 `ArrowEndSpec.marker`；react 只翻成 SVG。
 *   group 递归；fill 走 `markerFillToSvg`（contextStroke → context-stroke）。
 */
const renderMarkerPrim = (prim: MarkerPrimitive, key: number): ReactElement => {
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

/** `<ArrowMarker>` 组件 props */
export type ArrowMarkerProps = {
  /** marker 元素 id，用于 path markerStart / markerEnd 引用 */
  id: string;
  /** 端点级已解析 marker 描述（compile 已 merge / 查表 / 调 def.emit 产几何 + wrapper 参数） */
  spec: ArrowEndSpec;
};

/**
 * 单个 `<marker>` 元素，由 `<defs>` 包起来
 * @description emit-in-compile 物化：marker 内部几何来自 `spec.marker`（core 已产 `MarkerPrimitive[]`），
 *   wrapper 参数来自 `spec.baseSize`（viewBox `0 0 baseSize baseSize` + refY = baseSize/2）/ `spec.refX` /
 *   `spec.markerWidth` / `spec.markerHeight`。react 不再 switch shape、不算几何、不需 arrows 注册表。
 *   overflow=visible 允许空心描边落在标准几何边界外。
 */
export const ArrowMarker: FC<ArrowMarkerProps> = props => {
  const { id, spec } = props;
  return (
    <marker
      id={id}
      viewBox={`0 0 ${spec.baseSize} ${spec.baseSize}`}
      refX={spec.refX}
      refY={spec.baseSize / 2}
      markerWidth={spec.markerWidth}
      markerHeight={spec.markerHeight}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      preserveAspectRatio="none"
      overflow="visible"
      opacity={spec.opacity}
    >
      {spec.marker.map((prim, i) => renderMarkerPrim(prim, i))}
    </marker>
  );
};
