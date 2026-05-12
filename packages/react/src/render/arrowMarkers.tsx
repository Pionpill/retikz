import type { FC, ReactElement } from 'react';
import { type ArrowEndSpec, HOLLOW_ARROW_SHAPES } from '@retikz/core';

/** marker `<marker>` 默认尺寸（与 ADR-03 前硬编码一致，作为 length / width 缺省回退） */
const DEFAULT_MARKER_SIZE = 6;
/** 空心 shape 默认描边粗细（与 ADR-03 前硬编码一致） */
const DEFAULT_HOLLOW_STROKE_WIDTH = 1.5;

/**
 * 形状的 SVG 几何元素生成（接受解析后的 stroke / fill / strokeWidth）
 * @description 实心 shape 用 fill 主导（hollow=false 分支）；空心 shape 用 stroke + strokeWidth、fill='none'（hollow=true 分支）；空心 shape 的 strokeLinejoin 在 openDiamond 上保留 round（避免 viewBox clip）
 */
type RenderedShape = {
  /** marker viewBox 内 refX（apex 贴 path 端点；空心 shape refX 在背面） */
  refX: number;
  /** 形状内部 SVG 子元素 */
  inner: ReactElement;
};

const renderInner = (spec: ArrowEndSpec): RenderedShape => {
  const isHollow = HOLLOW_ARROW_SHAPES.has(spec.shape);
  const stroke = isHollow ? (spec.color ?? 'context-stroke') : undefined;
  // 实心 shape：fill 优先 → color 备用 → context-stroke 兜底
  const fill = isHollow ? 'none' : (spec.fill ?? spec.color ?? 'context-stroke');
  const strokeWidth = isHollow ? (spec.lineWidth ?? DEFAULT_HOLLOW_STROKE_WIDTH) : undefined;

  switch (spec.shape) {
    case 'normal':
      return {
        refX: 10,
        inner: <path d="M 0 0 L 10 5 L 0 10 Z" fill={fill} />,
      };
    case 'open':
      return {
        refX: 1,
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
        refX: 10,
        inner: <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill={fill} />,
      };
    case 'diamond':
      return {
        refX: 10,
        inner: <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill={fill} />,
      };
    case 'openDiamond':
      return {
        refX: 1,
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
        refX: 10,
        inner: <circle cx={5} cy={5} r={5} fill={fill} />,
      };
    case 'openCircle':
      return {
        refX: 0,
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
 * @description spec.scale 乘到 length/width 之后；spec.opacity 落到 marker 元素层；空心 shape 的 lineWidth 走 strokeWidth；缺省视觉字段全部走 context-stroke / 硬编码 fallback 维持向后兼容
 */
export const ArrowMarker: FC<ArrowMarkerProps> = props => {
  const { id, spec } = props;
  const scale = spec.scale ?? 1;
  const length = (spec.length ?? DEFAULT_MARKER_SIZE) * scale;
  const width = (spec.width ?? DEFAULT_MARKER_SIZE) * scale;
  const { refX, inner } = renderInner(spec);
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={refX}
      refY={5}
      markerWidth={length}
      markerHeight={width}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      opacity={spec.opacity}
    >
      {inner}
    </marker>
  );
};
