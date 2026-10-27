import type { ParsedCssColor } from '@retikz/foundation';
import { parseStaticCssColor } from '@retikz/foundation';

import type { IRLine, IRNode, IRNodeLabel } from '../../schemas';
import { NodeTextColor } from '../../schemas';
import type { IRNodeLabelDefault } from '../../schemas';
import { resolveGraphicOpacity } from '../style';
import type { PrimaryColorResolvedNode } from './types';

/** 判断正文行是否仍有内容需要继承节点文字色 */
const bodyLineInheritsNodeTextColor = (line: IRLine): boolean => {
  if (typeof line === 'string') return true;
  if ('segments' in line) return line.segments.some(segment => segment.fill === undefined);
  return line.fill === undefined;
};

/** 判断节点正文是否需要继承节点文字色 */
const bodyInheritsNodeTextColor = (text: IRNode['text']): boolean => {
  if (text === undefined) return false;
  if (typeof text === 'string') return true;
  return text.some(bodyLineInheritsNodeTextColor);
};

/** 判断标签正文或引线是否需要继承节点文字色 */
const labelInheritsNodeTextColor = (label: IRNodeLabel, labelDefault: IRNodeLabelDefault): boolean => {
  if (label.textColor !== undefined || labelDefault.textColor !== undefined || labelDefault.color !== undefined) {
    return false;
  }

  const textInherits = bodyInheritsNodeTextColor(label.text);
  const pinInherits = label.pin === true || (typeof label.pin === 'object' && label.pin.stroke === undefined);

  return textInherits || pinInherits;
};

/** 判断正文、标签或引线中是否仍有内容需要节点文字色 */
const hasNodeTextColorConsumer = (node: IRNode, labelDefault: IRNodeLabelDefault): boolean => {
  if (bodyInheritsNodeTextColor(node.text)) return true;
  if (node.label === undefined) return false;

  const labels = Array.isArray(node.label) ? node.label : [node.label];

  return labels.some(label => labelInheritsNodeTextColor(label, labelDefault));
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

/** 按 WCAG 对比率从相对亮度选择黑色或白色，相等时选择黑色 */
const chooseBlackOrWhiteForLuminance = (luminance: number): '#000000' | '#ffffff' => {
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
};

/** 按 WCAG 相对亮度选择对比度更高的黑色或白色 */
const contrastingBlackOrWhite = (color: ParsedCssColor): '#000000' | '#ffffff' => {
  const luminance = 0.2126 * linearizeSrgb(color.r) + 0.7152 * linearizeSrgb(color.g) + 0.0722 * linearizeSrgb(color.b);
  return chooseBlackOrWhiteForLuminance(luminance);
};

/**
 * 将节点的 auto-contrast 文字色解析为对比度更高的黑色或白色
 * @description 仅对可解析且完全不透明的纯色填充计算；其余情况发出警告并使用 currentColor。没有内容继承文字色时移除该配置
 * @template TNode 需要解析对比文字色的节点类型，保留其它节点字段
 */
export const resolveNodeTextColor = <TNode extends PrimaryColorResolvedNode>(
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
