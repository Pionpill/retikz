import { mergeProperties } from '@retikz/foundation';

import type { IRNodeLabelDefault, IRPathLabelDefault, IRPathLabel } from '../../schemas';
import { mergeFont } from './font';

/** 合并路径标签默认值，own 的非 undefined 字段优先，字体逐字段继承 */
export const mergePathLabelDefaults = (
  parent: IRPathLabelDefault = {},
  own: IRPathLabelDefault = {},
): IRPathLabelDefault => {
  const out = mergeProperties([parent, own], { shouldOverride: value => value !== undefined });
  const font = mergeFont(parent.font, own.font);
  if (font !== undefined) out.font = font;
  return out;
};

/** 合并节点标签配置，own 的非 undefined 字段优先；字体及两侧均为对象的 pin 逐字段合并 */
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

/** 为已有路径或步骤标签合入默认配置；文字色依次取标签 textColor、默认 textColor、合并后的 color、路径主色 */
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
