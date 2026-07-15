import type { IRFont, IRGeometryLabel, IRLabelDefault } from '../../schemas';
import type { StyleFrame } from './frame';

import { cuts, pickDefinedKeys } from './frame';

/** fold labelDefault 通道 */
export const resolveLabelDefault = (stack: ReadonlyArray<StyleFrame>): IRLabelDefault => {
  let acc: IRLabelDefault = {};
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'label')) acc = {};
    if (frame.labelDefault) acc = { ...acc, ...pickDefinedKeys(frame.labelDefault) };
  }
  return acc;
};

/** 逐字段合并字体 */
const mergeFont = (a: IRFont | undefined, b: IRFont | undefined): IRFont | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const out: IRFont = {};
  const family = a.family ?? b.family;
  if (family !== undefined) out.family = family;
  const size = a.size ?? b.size;
  if (size !== undefined) out.size = size;
  const weight = a.weight ?? b.weight;
  if (weight !== undefined) out.weight = weight;
  const style = a.style ?? b.style;
  if (style !== undefined) out.style = style;
  return out;
};

/** 解析 path label 的最终样式 */
export const resolveGeometryLabel = (
  label: IRGeometryLabel,
  labelDefault: IRLabelDefault,
  masterColor: string | undefined,
): IRGeometryLabel => {
  const out: IRGeometryLabel = { ...label };
  const textColor = label.textColor ?? labelDefault.textColor ?? labelDefault.color ?? masterColor;
  if (textColor !== undefined) out.textColor = textColor;
  else delete out.textColor;
  const font = mergeFont(label.font, labelDefault.font);
  if (font !== undefined) out.font = font;
  const opacity = label.opacity ?? labelDefault.opacity;
  if (opacity !== undefined) out.opacity = opacity;
  return out;
};
