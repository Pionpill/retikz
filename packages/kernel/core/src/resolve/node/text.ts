import type { ParsedCssColor } from '@retikz/foundation';
import { parseStaticCssColor } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRNode, IRNodeLabel, IRLine, IRMathSegment, IRTextSegment } from '../../schemas';
import { NodeTextColor } from '../../schemas';
import type { IRNodeLabelDefault } from '../../schemas';
import { resolvePaint } from '../resource';
import { resolveGraphicOpacity, mergeNodeLabelDefaults, resolveContextualColor } from '../style';
import type { InlineSegmentColorSource, ColorResolvedTextLine } from '../text';
import type {
  NodePrimaryColorSource,
  NodeColorSource,
  CanonicalNode,
  CanonicalNodeLabel,
  CanonicalNodeLabelPin,
  NodeLabelPlacementSource,
  NodeLabelPrimaryColorSource,
  NodeResolveContext,
} from './types';

/** 判断节点正文是否需要继承节点文字色 */
const bodyInheritsNodeTextColor = (text: IRNode['text']): boolean => {
  if (text === undefined) return false;
  if (typeof text === 'string') return true;
  return text.some(line => {
    if (typeof line === 'string') return true;
    if ('segments' in line) return line.segments.some(segment => segment.fill === undefined);
    return line.fill === undefined;
  });
};

/** 判断正文、标签或引线中是否仍有内容需要节点文字色 */
const hasNodeTextColorConsumer = (node: IRNode, labelDefault: IRNodeLabelDefault): boolean => {
  if (bodyInheritsNodeTextColor(node.text)) return true;
  if (node.label === undefined) return false;

  const labels = Array.isArray(node.label) ? node.label : [node.label];

  return labels.some(label => {
    if (label.textColor !== undefined || labelDefault.textColor !== undefined || labelDefault.color !== undefined) {
      return false;
    }

    const textInherits = bodyInheritsNodeTextColor(label.text);
    const pinInherits = label.pin === true || (typeof label.pin === 'object' && label.pin.stroke === undefined);

    return textInherits || pinInherits;
  });
};

/** 报告自动对比色无法计算的原因，并返回 currentColor */
const fallbackTextColor = (reason: string, warn: (code: string, message: string) => void): string => {
  const fallback = 'currentColor';
  warn(
    'TEXT_AUTO_CONTRAST_UNRESOLVED',
    `Cannot resolve Node auto-contrast text color: ${reason}; using fallback '${fallback}'`,
  );

  return fallback;
};

/** 把 sRGB 通道转换为线性光通道 */
const linearizeSrgb = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** 按 WCAG 相对亮度选择对比度更高的黑色或白色，相等时选择黑色 */
const contrastingBlackOrWhite = (color: ParsedCssColor): '#000000' | '#ffffff' => {
  const luminance = 0.2126 * linearizeSrgb(color.r) + 0.7152 * linearizeSrgb(color.g) + 0.0722 * linearizeSrgb(color.b);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
};

/**
 * 将节点的 auto-contrast 文字色解析为对比度更高的黑色或白色
 * @description 仅对可解析且完全不透明的纯色填充计算；其余情况发出警告并使用 currentColor。没有内容继承文字色时移除该配置
 * @template TNode 需要解析对比文字色的节点类型，保留其它节点字段
 */
export const resolveNodeTextColor = <TNode extends NodePrimaryColorSource>(
  node: TNode,
  labelDefault: IRNodeLabelDefault,
  warn: (code: string, message: string) => void,
): TNode => {
  if (node.style?.textColor !== NodeTextColor.Contrast) return node;

  if (!hasNodeTextColorConsumer(node, labelDefault)) {
    const style = { ...node.style };
    delete style.textColor;
    const resolved = { ...node, style };

    return resolved;
  }

  const fill = node.style.fill;
  if (fill === undefined) {
    return {
      ...node,
      style: { ...node.style, textColor: fallbackTextColor('fill is missing, so the background is unknown', warn) },
    };
  }

  if (typeof fill !== 'string') {
    return {
      ...node,
      style: { ...node.style, textColor: fallbackTextColor(`unsupported fill paint kind '${fill.kind}'`, warn) },
    };
  }

  const parsedFill = parseStaticCssColor(fill);
  if (!parsedFill) {
    return {
      ...node,
      style: { ...node.style, textColor: fallbackTextColor(`unsupported fill '${fill}'`, warn) },
    };
  }

  const effectiveAlpha = parsedFill.a * (resolveGraphicOpacity(node.style.opacity).fillOpacity ?? 1);
  if (effectiveAlpha !== 1) {
    return {
      ...node,
      style: { ...node.style, textColor: fallbackTextColor(`effective fill '${fill}' is not opaque`, warn) },
    };
  }

  return {
    ...node,
    style: { ...node.style, textColor: contrastingBlackOrWhite(parsedFill) },
  };
};

/** 展开正文单字符串为单行数组 */
export const expandNodeText = (text: NodeColorSource['text']): CanonicalNode['text'] =>
  text === undefined ? undefined : typeof text === 'string' ? [text] : text;

/** 补齐标签位置：缺省为 top，边界位置对象缺省比例为 0.5 */
const expandNodeLabelPosition = (position: IRNodeLabel['position']): CanonicalNodeLabel['position'] => {
  if (position === undefined) return 'top';
  if (typeof position === 'object') return { ...position, fraction: position.fraction ?? 0.5 };
  return position;
};

/** 用标签默认配置补齐单个标签，并拒绝内部标签使用引线 */
const expandNodeLabel = (
  label: IRNodeLabel,
  labelDefault: IRNodeLabelDefault,
  labelDistance: number,
): NodeLabelPlacementSource => {
  const { color, ...configuration } = mergeNodeLabelDefaults(labelDefault, label);
  const normalized: NodeLabelPlacementSource = {
    ...configuration,
    text: label.text,
    align: configuration.align ?? 'middle',
    position: expandNodeLabelPosition(configuration.position),
    placement: configuration.placement ?? 'outside',
    distance: configuration.distance ?? labelDistance,
  };
  if (normalized.textColor === undefined && color !== undefined) normalized.textColor = color;
  if (normalized.placement === 'inside' && normalized.pin) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, 'Node label pin is only supported for outside placement');
  }

  return normalized;
};

/** 展开单标签与标签数组为等价数组写法 */
export const expandNodeLabels = (
  label: IRNode['label'],
  labelDefault: IRNodeLabelDefault,
  labelDistance: number,
): Array<NodeLabelPlacementSource> | undefined =>
  label === undefined
    ? undefined
    : Array.isArray(label)
      ? label.map(item => expandNodeLabel(item, labelDefault, labelDistance))
      : [expandNodeLabel(label, labelDefault, labelDistance)];

/** 解析单个文字或公式片段的数值颜色 */
const resolveInlineSegmentColor = (
  segment: IRTextSegment | IRMathSegment,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): InlineSegmentColorSource => {
  const { fill, ...source } = segment;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 解析正文行及其片段的数值颜色 */
const resolveNodeLineColors = (
  line: IRLine,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ColorResolvedTextLine => {
  if (typeof line === 'string') return line;
  if ('segments' in line) {
    return {
      ...line,
      fill:
        line.fill === undefined
          ? undefined
          : resolveContextualColor(line.fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }),
      segments: line.segments.map((segment, index) =>
        resolveInlineSegmentColor(segment, masterColor, mode, `${fieldPath}.segments[${index}]`),
      ),
    };
  }

  const { fill, ...source } = line;

  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 解析节点标签的文字主色、行内片段颜色与引线绘制配置 */
const resolveNodeLabelColors = (
  label: NodeLabelPlacementSource,
  labelMasterColor: string | undefined,
  inheritedTextColor: string | undefined,
  context: NodeResolveContext,
  fieldPath: string,
): CanonicalNodeLabel => {
  const { textColor, text, pin, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? inheritedTextColor
      : resolveContextualColor(textColor, {
          masterColor: labelMasterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.textColor`,
        });
  const textMaster = resolvedTextColor ?? inheritedTextColor;
  let resolvedPin: boolean | CanonicalNodeLabelPin | undefined;
  if (typeof pin === 'object') {
    const { stroke, ...pinSource } = pin;
    resolvedPin = {
      ...pinSource,
      ...(stroke === undefined
        ? {}
        : {
            stroke: resolvePaint(
              typeof stroke === 'object'
                ? stroke
                : resolveContextualColor(stroke, {
                    masterColor: textMaster,
                    mode: context.mode,
                    fieldPath: `${fieldPath}.pin.stroke`,
                  }),
              { patternRegistry: context.patternRegistry, round: context.round, irPath: `${fieldPath}.pin.stroke` },
            ),
          }),
    };
  } else {
    resolvedPin = pin;
  }

  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text:
      typeof text === 'string'
        ? text
        : text.map((line, index) =>
            resolveNodeLineColors(line, textMaster, context.mode, `${fieldPath}.text[${index}]`),
          ),
    ...(resolvedPin === undefined ? {} : { pin: resolvedPin }),
  };
};

/** 用自动对比色计算后的文字主色，解析正文、标签片段和引线的数值颜色 */
export const resolveNodeDependentColors = (
  node: NodeLabelPrimaryColorSource,
  labelDefault: IRNodeLabelDefault,
  context: NodeResolveContext,
  labelWasArray: boolean,
): NodeColorSource => {
  const { text, label, ...source } = node;
  const textMaster = node.style?.textColor;

  return {
    ...source,
    ...(text === undefined
      ? {}
      : {
          text:
            typeof text === 'string'
              ? text
              : text.map((line, index) =>
                  resolveNodeLineColors(line, textMaster, context.mode, `${context.irPath}.text[${index}]`),
                ),
        }),
    ...(label === undefined
      ? {}
      : {
          label: (Array.isArray(label) ? label : [label]).map((item, index) =>
            resolveNodeLabelColors(
              item,
              labelDefault.color ?? node.style?.color,
              textMaster,
              context,
              labelWasArray ? `${context.irPath}.label[${index}]` : `${context.irPath}.label`,
            ),
          ),
        }),
  };
};
