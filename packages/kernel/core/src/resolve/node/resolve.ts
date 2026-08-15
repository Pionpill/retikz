import type { BoundsInsets } from '@retikz/math';

import type { IRAxisScale, IRBoxSize, IRBoxSpacing, IRNode, IRNodeLabel } from '../../schemas';
import type { CanonicalNode, CanonicalNodeLabel, NodeResolution, NodeResolveContext } from './types';

import { resolvePaint } from '../resource';
import { resolveEffectiveLabelDefault, resolveEffectiveNodeStyle } from '../style';
import { resolveDashPattern, resolveDropShadow } from '../style';
import { resolveBoundaryReference } from './boundary';
import { resolveNodeShape } from './shape';
import { resolveNodeTextColor } from './text-color';

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
const expandBoxSpacing = (value: number | IRBoxSpacing | undefined, fallback: number): BoundsInsets => {
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
const expandAxisScale = (value: number | IRAxisScale | undefined): CanonicalNode['scale'] => {
  if (typeof value === 'number') return { x: value, y: value };
  const base = value?.default ?? 1;
  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

/** 展开 Node 的单值或宽高最小尺寸 */
const expandBoxSize = (value: number | IRBoxSize | undefined): CanonicalNode['minimumSize'] => {
  if (typeof value === 'number') return { width: value, height: value };
  const base = value?.default ?? 0;
  return {
    width: value?.width ?? base,
    height: value?.height ?? base,
  };
};

/** 展开正文单字符串为单行数组 */
const expandNodeText = (text: IRNode['text']): CanonicalNode['text'] =>
  text === undefined ? undefined : typeof text === 'string' ? [text] : text;

/** 展开标签边界位置的比例缺省值 */
const expandNodeLabelPosition = (position: IRNodeLabel['position']): CanonicalNodeLabel['position'] => {
  if (position === undefined) return 'top';
  if (typeof position === 'object') return { ...position, fraction: position.fraction ?? 0.5 };
  return position;
};

/** 按有效 labelDefault 补齐一个标签，并保留显式字段优先级 */
const expandNodeLabel = (
  label: IRNodeLabel,
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
): CanonicalNodeLabel => {
  const normalized: CanonicalNodeLabel = {
    ...label,
    position: expandNodeLabelPosition(label.position),
    placement: label.placement ?? 'outside',
  };
  const defaultTextColor = labelDefault.textColor ?? labelDefault.color;
  if (normalized.textColor === undefined && defaultTextColor !== undefined) normalized.textColor = defaultTextColor;
  const defaultFont = labelDefault.font;
  if (defaultFont !== undefined) {
    const font = {
      ...(defaultFont.family === undefined && normalized.font?.family === undefined
        ? {}
        : { family: normalized.font?.family ?? defaultFont.family }),
      ...(defaultFont.size === undefined && normalized.font?.size === undefined
        ? {}
        : { size: normalized.font?.size ?? defaultFont.size }),
      ...(defaultFont.weight === undefined && normalized.font?.weight === undefined
        ? {}
        : { weight: normalized.font?.weight ?? defaultFont.weight }),
      ...(defaultFont.style === undefined && normalized.font?.style === undefined
        ? {}
        : { style: normalized.font?.style ?? defaultFont.style }),
    };
    if (Object.keys(font).length > 0) normalized.font = font;
  }
  if (normalized.opacity === undefined && labelDefault.opacity !== undefined) normalized.opacity = labelDefault.opacity;
  return normalized;
};

/** 展开单标签与标签数组为等价数组写法 */
const expandNodeLabels = (
  label: IRNode['label'],
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
): CanonicalNode['label'] =>
  label === undefined
    ? undefined
    : Array.isArray(label)
      ? label.map(item => expandNodeLabel(item, labelDefault))
      : [expandNodeLabel(label, labelDefault)];

/** 将 Node 的持久化紧凑字段展开为布局可直接消费的完整形态 */
const canonicalizeNode = (
  node: IRNode,
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
): CanonicalNode => {
  const { dashed, dotted, ...source } = node;
  return {
    ...source,
    padding: expandBoxSpacing(node.padding, DEFAULT_NODE_PADDING),
    margin: expandBoxSpacing(node.margin, 0),
    minimumSize: expandBoxSize(node.minimumSize),
    scale: expandAxisScale(node.scale),
    text: expandNodeText(node.text),
    label: expandNodeLabels(node.label, labelDefault),
    align: node.align ?? 'middle',
    rotate: node.rotate ?? 0,
    dashPattern: resolveDashPattern(node.dashPattern, dashed, dotted),
    shadow: resolveDropShadow(node.shadow),
  };
};

/** 解析 Node 的样式、静态默认值、provider 与布局前 canonical 形态 */
export const resolveNode = (source: IRNode, context: NodeResolveContext): NodeResolution => {
  const effectiveNode = resolveEffectiveNodeStyle(source, context.styleFrames);
  const effectiveLabelDefault = resolveEffectiveLabelDefault(context.styleFrames);
  const labelsMaterialized = {
    ...effectiveNode,
    label: expandNodeLabels(effectiveNode.label, effectiveLabelDefault),
  };
  const contrastResolved = resolveNodeTextColor(labelsMaterialized, effectiveLabelDefault, context.warn);
  const node = canonicalizeNode(contrastResolved, effectiveLabelDefault);
  const shape = resolveNodeShape({
    node,
    shapes: context.shapes,
    scaleX: node.scale.x,
    scaleY: node.scale.y,
    irPath: context.irPath,
  });
  const boundary = resolveBoundaryReference(node.boundary, {
    visualDef: shape.definition,
    visualParams: shape.params,
    shapeRegistry: context.shapes,
    boundaryRegistry: context.boundaries,
    irPath: context.irPath,
  });
  const fill = resolvePaint(node.fill, {
    patterns: context.patterns,
    round: context.round,
    irPath: context.irPath,
  });
  const stroke = resolvePaint(node.stroke, {
    patterns: context.patterns,
    round: context.round,
    irPath: context.irPath,
  });
  const paint = {
    ...(fill === undefined ? {} : { fill }),
    ...(stroke === undefined ? {} : { stroke }),
  };
  return { irPath: context.irPath, node, shape, boundary, paint };
};
