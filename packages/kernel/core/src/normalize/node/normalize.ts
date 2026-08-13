import type { BoundsInsets } from '@retikz/math';

import type { IRAxisScale, IRBoxSize, IRBoxSpacing, IRNode } from '../../schemas';
import type { CanonicalNode } from './types';

/** Node 缺省内边距 */
const DEFAULT_NODE_PADDING = 8;

/** 将单值构造成完整四边间距 */
const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/** 展开 Node 的单值或 CSS-like 四边间距 */
const normalizeBoxSpacing = (value: number | IRBoxSpacing | undefined, fallback: number): BoundsInsets => {
  if (typeof value === 'number') return boxInsets(value);
  const base = value?.default ?? fallback;
  return {
    top: value?.top ?? value?.y ?? base,
    right: value?.right ?? value?.x ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
    left: value?.left ?? value?.x ?? base,
  };
};

/** 展开 Node 的单值或轴向缩放 */
const normalizeAxisScale = (value: number | IRAxisScale | undefined): CanonicalNode['scale'] => {
  if (typeof value === 'number') return { x: value, y: value };
  const base = value?.default ?? 1;
  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

/** 展开 Node 的单值或宽高最小尺寸 */
const normalizeBoxSize = (value: number | IRBoxSize | undefined): CanonicalNode['minimumSize'] => {
  if (typeof value === 'number') return { width: value, height: value };
  const base = value?.default ?? 0;
  return {
    width: value?.width ?? base,
    height: value?.height ?? base,
  };
};

/** 将 Node 的持久化紧凑字段展开为布局可直接消费的完整形态 */
export const normalizeNode = (node: IRNode): CanonicalNode => ({
  ...node,
  padding: normalizeBoxSpacing(node.padding, DEFAULT_NODE_PADDING),
  margin: normalizeBoxSpacing(node.margin, 0),
  minimumSize: normalizeBoxSize(node.minimumSize),
  scale: normalizeAxisScale(node.scale),
});
