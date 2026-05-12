import type { FC, ReactElement } from 'react';
import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  type ArrowEndSpec,
  HOLLOW_ARROW_SHAPES,
} from '@retikz/core';

/**
 * 形状的 SVG 几何元素 + refX（path 端点对齐位置）
 * @description 不论实心 / 空心：refX 都落在 shape 的"back 接线点"——line tip 接在该点、apex 顶端经由 compile/path.ts 的 shrink 退回原 target。低 opacity 下 line 不再透过 marker。
 *
 * 各 shape 的 refX：
 * - `normal` / `diamond` / `circle`：back 外缘 x=0 → refX=0；apex 在 viewBox x=10
 * - `stealth`：V tip x=3（line 嵌进凹口）→ refX=3
 * - `open` / `openDiamond`：back stroke 外缘 x = 1 - lineWidth/2
 * - `openCircle`：back 外缘左 x = 0.75 - lineWidth/2（默认 lineWidth=1.5 时为 0）
 */
type RenderedShape = {
  refX: number;
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
        refX: 0,
        inner: <path d="M 0 0 L 10 5 L 0 10 Z" fill={fill} />,
      };
    case 'open':
      return {
        // back stroke 外缘：1 - lineWidth/2
        refX: 1 - (lineWidth ?? 0) / 2,
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
        // V tip 在 viewBox x=3，line 嵌进凹口
        refX: 3,
        inner: <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill={fill} />,
      };
    case 'diamond':
      return {
        refX: 0,
        inner: <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill={fill} />,
      };
    case 'openDiamond':
      return {
        refX: 1 - (lineWidth ?? 0) / 2,
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
        refX: 0,
        inner: <circle cx={5} cy={5} r={5} fill={fill} />,
      };
    case 'openCircle':
      return {
        // 圆外缘左：5 - 4.25 - lineWidth/2 = 0.75 - lineWidth/2（默认 lineWidth=1.5 时为 0）
        refX: 0.75 - (lineWidth ?? 0) / 2,
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
 * @description spec.scale 乘到 length/width 之后；spec.opacity 落到 marker 元素层；空心 shape 的 lineWidth 走 strokeWidth；overflow=visible 让 back stroke 落在 viewBox 外（refX 可负，由 stroke 半宽决定）也能正常渲染；缺省视觉字段全部走 context-stroke / ARROW_MARKER_DEFAULT_SIZE 兜底
 */
export const ArrowMarker: FC<ArrowMarkerProps> = props => {
  const { id, spec } = props;
  const scale = spec.scale ?? 1;
  const length = (spec.length ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const width = (spec.width ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
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
      overflow="visible"
      opacity={spec.opacity}
    >
      {inner}
    </marker>
  );
};
