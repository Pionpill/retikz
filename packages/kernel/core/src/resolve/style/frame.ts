import type { IRScope, StyleChannel } from '../../schemas';
import type { CascadeState, StyleResolveFrame } from './types';

/** 拷贝源对象中 !== undefined 的字段 */
export const pickDefinedKeys = <T extends object>(src: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const key of Object.keys(src) as Array<keyof T>) {
    const value = src[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
};

/** 从 IRScope 抽取样式解析 frame */
export const createStyleResolveFrame = (scope: IRScope): StyleResolveFrame => {
  const cascade: CascadeState = {};
  if (scope.style?.color !== undefined) cascade.color = scope.style.color;
  if (scope.style?.stroke !== undefined) cascade.stroke = scope.style.stroke;
  if (scope.style?.fill !== undefined) cascade.fill = scope.style.fill;
  if (scope.style?.strokeWidth !== undefined) cascade.strokeWidth = scope.style.strokeWidth;
  if (scope.style?.opacity !== undefined) cascade.opacity = scope.style.opacity;
  if (scope.style?.fillOpacity !== undefined) cascade.fillOpacity = scope.style.fillOpacity;
  if (scope.style?.strokeOpacity !== undefined) cascade.strokeOpacity = scope.style.strokeOpacity;
  const frame: StyleResolveFrame = { cascade };
  if (scope.defaults?.node) frame.nodeDefault = scope.defaults.node;
  if (scope.defaults?.path) frame.pathDefault = scope.defaults.path;
  if (scope.defaults?.label) frame.labelDefault = scope.defaults.label;
  if (scope.defaults?.arrow) frame.arrowDefault = scope.defaults.arrow;
  if (scope.defaults?.reset !== undefined) frame.resetStyle = scope.defaults.reset;
  return frame;
};

/** resetStyle 是否切断某通道 */
export const cutsStyleChannel = (reset: StyleResolveFrame['resetStyle'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  if (reset === true) return true;
  return reset.includes(channel);
};
