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
  if (scope.color !== undefined) cascade.color = scope.color;
  if (scope.stroke !== undefined) cascade.stroke = scope.stroke;
  if (scope.fill !== undefined) cascade.fill = scope.fill;
  if (scope.strokeWidth !== undefined) cascade.strokeWidth = scope.strokeWidth;
  if (scope.opacity !== undefined) cascade.opacity = scope.opacity;
  if (scope.fillOpacity !== undefined) cascade.fillOpacity = scope.fillOpacity;
  if (scope.strokeOpacity !== undefined) cascade.strokeOpacity = scope.strokeOpacity;
  const frame: StyleResolveFrame = { cascade };
  if (scope.nodeDefault) frame.nodeDefault = scope.nodeDefault;
  if (scope.pathDefault) frame.pathDefault = scope.pathDefault;
  if (scope.labelDefault) frame.labelDefault = scope.labelDefault;
  if (scope.arrowDefault) frame.arrowDefault = scope.arrowDefault;
  if (scope.resetStyle !== undefined) frame.resetStyle = scope.resetStyle;
  return frame;
};

/** resetStyle 是否切断某通道 */
export const cutsStyleChannel = (reset: StyleResolveFrame['resetStyle'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  if (reset === true) return true;
  return reset.includes(channel);
};
