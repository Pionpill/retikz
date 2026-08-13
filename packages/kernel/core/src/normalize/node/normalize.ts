import type { BoundsInsets } from '@retikz/math';

import type { IRAxisScale, IRBoxSize, IRBoxSpacing, IRNode, IRNodeLabel } from '../../schemas';
import type { CanonicalNode, CanonicalNodeLabel } from './types';

import { normalizeShadow } from '../shadow';
import { normalizeDashPattern } from '../stroke';

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

/** 展开正文单字符串为单行数组 */
const normalizeNodeText = (text: IRNode['text']): CanonicalNode['text'] =>
  text === undefined ? undefined : typeof text === 'string' ? [text] : text;

/** 展开标签边界位置的比例缺省值 */
const normalizeNodeLabelPosition = (position: IRNodeLabel['position']): CanonicalNodeLabel['position'] => {
  if (position === undefined) return 'top';
  if (typeof position === 'object') return { ...position, fraction: position.fraction ?? 0.5 };
  return position;
};

/** 展开单个标签的静态默认值 */
const normalizeNodeLabel = (label: IRNodeLabel): CanonicalNodeLabel => ({
  ...label,
  position: normalizeNodeLabelPosition(label.position),
  placement: label.placement ?? 'outside',
});

/** 展开单标签与标签数组的等价写法 */
const normalizeNodeLabels = (label: IRNode['label']): CanonicalNode['label'] =>
  label === undefined ? undefined : Array.isArray(label) ? label.map(normalizeNodeLabel) : [normalizeNodeLabel(label)];

/** 将 Node 的持久化紧凑字段展开为布局可直接消费的完整形态 */
export const normalizeNode = (node: IRNode): CanonicalNode => {
  const { dashed, dotted, ...source } = node;
  return {
    ...source,
    padding: normalizeBoxSpacing(node.padding, DEFAULT_NODE_PADDING),
    margin: normalizeBoxSpacing(node.margin, 0),
    minimumSize: normalizeBoxSize(node.minimumSize),
    scale: normalizeAxisScale(node.scale),
    text: normalizeNodeText(node.text),
    label: normalizeNodeLabels(node.label),
    align: node.align ?? 'middle',
    rotate: node.rotate ?? 0,
    dashPattern: normalizeDashPattern(node.dashPattern, dashed, dotted),
    shadow: normalizeShadow(node.shadow),
  };
};
