import type { FC, ReactElement } from 'react';
import type { ArrowShape } from '@retikz/core';

/**
 * 各 arrow 形状的 SVG `<marker>` 内容定义
 * @description 共用约定：viewBox `0 0 10 10`、refY=5、markerUnits='strokeWidth'（marker 随 path strokeWidth 缩放）、orient='auto-start-reverse'（marker-start / marker-end 共用，start 自动反转 180°）、`context-stroke`/`context-fill` 让箭头随 path 同步配色；refX 差异：实心 shape（normal / stealth / diamond / circle）refX=10 apex 贴端点不需 shrink，空心 shape（open / openDiamond / openCircle）refX 设在背面 path 停在背面 apex 向前，需 compile 层 shrink 让 apex 落在原始端点（量见 compile/path.ts 的 SHRINK_FOR_SHAPE）
 */
type MarkerSpec = {
  /** marker 在 path 端点的 alignment X（viewBox 坐标，0..10） */
  refX: number;
  /** 内部图形元素，挂在 `<marker>` 下 */
  children: ReactElement;
};

const MARKERS: Record<ArrowShape, MarkerSpec> = {
  normal: {
    refX: 10,
    children: <path d="M 0 0 L 10 5 L 0 10 Z" fill="context-stroke" />,
  },
  open: {
    // refX=1：背面贴 path 端点；apex 向前延伸
    refX: 1,
    children: (
      <path
        d="M 1 1 L 9 5 L 1 9 Z"
        fill="none"
        stroke="context-stroke"
        strokeWidth={1.5}
      />
    ),
  },
  stealth: {
    refX: 10,
    children: <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill="context-stroke" />,
  },
  diamond: {
    refX: 10,
    children: <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill="context-stroke" />,
  },
  openDiamond: {
    // refX=1：左尖在背面、右尖在 viewBox x=9（与 shrink=4.8 配套落在原始端点）；
    // 顶点向内 1 单位避开 round-join 0.75 单位外延导致的 viewBox clip
    refX: 1,
    children: (
      <path
        d="M 1 5 L 5 1 L 9 5 L 5 9 Z"
        fill="none"
        stroke="context-stroke"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    ),
  },
  circle: {
    refX: 10,
    children: <circle cx={5} cy={5} r={5} fill="context-stroke" />,
  },
  openCircle: {
    // refX=0：圆左缘在 path 端点（背面）；右缘在 apex 位置（与 shrink 配套时落在原始端点）
    refX: 0,
    children: (
      <circle
        cx={5}
        cy={5}
        r={4.25}
        fill="none"
        stroke="context-stroke"
        strokeWidth={1.5}
      />
    ),
  },
};

export type ArrowMarkerProps = {
  /** marker 元素 id，用于 path markerStart / markerEnd 引用 */
  id: string;
  /** 形状名 */
  shape: ArrowShape;
};

/** 单个 `<marker>` 元素，由 `<defs>` 包起来 */
export const ArrowMarker: FC<ArrowMarkerProps> = ({ id, shape }) => {
  const spec = MARKERS[shape];
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={spec.refX}
      refY={5}
      markerWidth={6}
      markerHeight={6}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
    >
      {spec.children}
    </marker>
  );
};
