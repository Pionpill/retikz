import { mergeProperties } from '@retikz/foundation';

import type { IRNodeLabelDefault, IRPathLabelDefault, IRPathLabel } from '../../schemas';
import { mergeFont } from './font';

/** 合并路径标签默认配置，字体逐字段覆盖 */
export const mergePathLabelDefaults = (
  parent: IRPathLabelDefault = {},
  own: IRPathLabelDefault = {},
): IRPathLabelDefault => {
  const out = mergeProperties([parent, own], { shouldOverride: value => value !== undefined });
  const font = mergeFont(parent.font, own.font);
  if (font !== undefined) out.font = font;
  return out;
};

/** 合并节点标签配置；pin 对象逐字段覆盖，布尔值整体替换 */
export const mergeNodeLabelDefaults = (
  parent: IRNodeLabelDefault = {},
  own: IRNodeLabelDefault = {},
): IRNodeLabelDefault => {
  const out = mergeProperties([parent, own], { shouldOverride: value => value !== undefined });
  const font = mergeFont(parent.font, own.font);
  if (font !== undefined) out.font = font;
  if (typeof parent.pin === 'object' && typeof own.pin === 'object') {
    out.pin = mergeProperties([parent.pin, own.pin], { shouldOverride: value => value !== undefined });
  }
  return out;
};

/** 解析路径或步骤已有标签的配置，默认片段不产生内容 */
export const resolvePathLabel = (
  label: IRPathLabel,
  labelDefault: Readonly<IRPathLabelDefault>,
  masterColor: string | undefined,
): IRPathLabel => {
  const { color, ...configuration } = mergePathLabelDefaults(labelDefault, label);
  const out: IRPathLabel = { ...configuration, text: label.text };
  const textColor = label.textColor ?? labelDefault.textColor ?? color ?? masterColor;
  if (textColor !== undefined) out.textColor = textColor;
  return out;
};
