import type { IRLabelDefault, IRLineSpec, IRNode, IRNodeLabel } from '../../../schemas';
import type { CompileWarningCodeValue } from '../../warning';
import type { ParsedCssColor } from './types';

import { NodeTextColor } from '../../../schemas';
import { CompileWarningCode } from '../../constants';
import { parseStaticCssColor } from './parse';

/** 判断正文行是否仍消费 Node 文字颜色 */
const bodyLineInheritsNodeTextColor = (line: IRLineSpec): boolean => {
  if (typeof line === 'string') return true;
  if ('runs' in line) return line.runs.some(run => run.fill === undefined);
  return line.fill === undefined;
};

/** 判断 Node 正文是否仍消费 Node 文字颜色 */
const bodyInheritsNodeTextColor = (text: IRNode['text']): boolean => {
  if (text === undefined) return false;
  if (typeof text === 'string') return true;
  return text.some(bodyLineInheritsNodeTextColor);
};

/** 判断 label 的正文或 pin 是否仍消费 Node 文字颜色 */
const labelInheritsNodeTextColor = (label: IRNodeLabel, labelDefault: IRLabelDefault): boolean => {
  if (label.textColor !== undefined || labelDefault.textColor !== undefined || labelDefault.color !== undefined) {
    return false;
  }
  const textInherits = typeof label.text === 'string' || label.text.runs.some(run => run.fill === undefined);
  const pinInherits = label.pin === true || (typeof label.pin === 'object' && label.pin.stroke === undefined);
  return textInherits || pinInherits;
};

/** 判断至少一个真实文本或 pin 消费者是否继承 Node 文字颜色 */
const hasNodeTextColorConsumer = (node: IRNode, labelDefault: IRLabelDefault): boolean => {
  if (bodyInheritsNodeTextColor(node.text)) return true;
  if (node.label === undefined) return false;
  const labels = Array.isArray(node.label) ? node.label : [node.label];
  return labels.some(label => labelInheritsNodeTextColor(label, labelDefault));
};

/** 把不可解析原因转成稳定 warning，并返回固定 fallback */
const fallbackTextColor = (reason: string, warn: (code: CompileWarningCodeValue, message: string) => void): string => {
  const fallback = 'currentColor';
  warn(
    CompileWarningCode.TextAutoContrastUnresolved,
    `Cannot resolve Node auto-contrast text color: ${reason}; using fallback '${fallback}'`,
  );
  return fallback;
};

/** 把 sRGB 通道转换为线性光通道 */
const linearizeSrgb = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** 按 WCAG 对比率从相对亮度选择黑色或白色，相等时选择黑色 */
export const chooseBlackOrWhiteForLuminance = (luminance: number): '#000000' | '#ffffff' => {
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
};

/** 按 WCAG 相对亮度选择对比度更高的黑色或白色 */
const contrastingBlackOrWhite = (color: ParsedCssColor): '#000000' | '#ffffff' => {
  const luminance = 0.2126 * linearizeSrgb(color.r) + 0.7152 * linearizeSrgb(color.g) + 0.0722 * linearizeSrgb(color.b);
  return chooseBlackOrWhiteForLuminance(luminance);
};

/** 解析 Node auto-contrast 关键字，供 layout 消费具体 CSS color */
export const resolveNodeTextColor = (
  node: IRNode,
  labelDefault: IRLabelDefault,
  warn: (code: CompileWarningCodeValue, message: string) => void,
): IRNode => {
  if (node.textColor !== NodeTextColor.Contrast) return node;

  if (!hasNodeTextColorConsumer(node, labelDefault)) {
    const resolved: IRNode = { ...node, textColor: undefined };
    delete resolved.textColor;
    return resolved;
  }

  const fill = node.fill;
  if (fill === undefined) {
    return {
      ...node,
      textColor: fallbackTextColor('fill is missing, so the background is unknown', warn),
    };
  }
  if (typeof fill !== 'string') {
    return {
      ...node,
      textColor: fallbackTextColor(`unsupported fill paint kind '${fill.kind}'`, warn),
    };
  }
  const parsedFill = parseStaticCssColor(fill);
  if (!parsedFill) {
    return {
      ...node,
      textColor: fallbackTextColor(`unsupported fill '${fill}'`, warn),
    };
  }
  const effectiveAlpha = parsedFill.a * (node.fillOpacity ?? 1);
  if (effectiveAlpha !== 1) {
    return {
      ...node,
      textColor: fallbackTextColor(`effective fill '${fill}' is not opaque`, warn),
    };
  }

  return {
    ...node,
    textColor: contrastingBlackOrWhite(parsedFill),
  };
};
