import type { FC, ReactElement } from 'react';
import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  type ArrowEndSpec,
  HOLLOW_ARROW_SHAPES,
} from '@retikz/core';

/** 形状的 SVG 几何元素 + 路径线段接触位置 */
type RenderedShape = {
  lineContactX: number;
  inner: ReactElement;
};

const renderInner = (spec: ArrowEndSpec): RenderedShape => {
  const isHollow = HOLLOW_ARROW_SHAPES.has(spec.shape);
  const stroke = isHollow ? (spec.color ?? 'context-stroke') : undefined;
  // 实心 shape：fill 优先 → color 备用 → context-stroke 兜底
  const fill = isHollow ? 'none' : (spec.fill ?? spec.color ?? 'context-stroke');
  const lineWidth = isHollow
    ? (spec.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH)
    : undefined;
  const strokeWidth = lineWidth;

  switch (spec.shape) {
    case 'normal':
      return {
        lineContactX: 0,
        inner: <path d="M 0 0 L 10 5 L 0 10 Z" fill={fill} />,
      };
    case 'open':
      return {
        lineContactX: 1 - (lineWidth ?? 0) / 2,
        inner: (
          <path
            d="M 1 1 L 9 5 L 1 9 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ),
      };
    case 'stealth':
      return {
        lineContactX: 3,
        inner: <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill={fill} />,
      };
    case 'diamond':
      return {
        lineContactX: 0,
        inner: <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill={fill} />,
      };
    case 'openDiamond':
      return {
        lineContactX: 1 - (lineWidth ?? 0) / 2,
        inner: (
          <path
            d="M 1 5 L 5 1 L 9 5 L 5 9 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        ),
      };
    case 'circle':
      return {
        lineContactX: 0,
        inner: <circle cx={5} cy={5} r={5} fill={fill} />,
      };
    case 'openCircle':
      return {
        lineContactX: 0.75 - (lineWidth ?? 0) / 2,
        inner: (
          <circle
            cx={5}
            cy={5}
            r={4.25}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ),
      };
  }
};

/** `<ArrowMarker>` 组件 props */
export type ArrowMarkerProps = {
  /** marker 元素 id，用于 path markerStart / markerEnd 引用 */
  id: string;
  /** 端点级箭头视觉规格（compile 已 resolve start/end merge + 空心 silent fill ignore） */
  spec: ArrowEndSpec;
};

/**
 * 单个 `<marker>` 元素，由 `<defs>` 包起来
 * @description spec.scale 乘到 length/width 之后；spec.opacity 落到 marker 元素层；空心 shape 的 lineWidth 走 strokeWidth；overflow=visible 允许空心描边落在标准几何边界外；缺省视觉字段全部走 context-stroke / ARROW_MARKER_DEFAULT_SIZE 兜底
 */
export const ArrowMarker: FC<ArrowMarkerProps> = props => {
  const { id, spec } = props;
  const scale = spec.scale ?? 1;
  const length = (spec.length ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const width = (spec.width ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const { lineContactX, inner } = renderInner(spec);
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={lineContactX}
      refY={5}
      markerWidth={length}
      markerHeight={width}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      preserveAspectRatio="none"
      overflow="visible"
      opacity={spec.opacity}
    >
      {inner}
    </marker>
  );
};
