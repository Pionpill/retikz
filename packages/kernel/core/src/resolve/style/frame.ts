import type { IRScope, StyleChannel } from '../../schemas';
import type { CascadeState, StyleResolveFrame } from './types';

/** 从 IRScope 抽取样式解析 frame */
export const createStyleResolveFrame = (scope: IRScope): StyleResolveFrame => {
  const cascade: CascadeState = {};
  if (scope.defaults?.style?.color !== undefined) cascade.color = scope.defaults.style.color;
  if (scope.defaults?.style?.stroke !== undefined) cascade.stroke = scope.defaults.style.stroke;
  if (scope.defaults?.style?.fill !== undefined) cascade.fill = scope.defaults.style.fill;
  if (scope.defaults?.style?.strokeWidth !== undefined) cascade.strokeWidth = scope.defaults.style.strokeWidth;
  if (scope.defaults?.style?.opacity !== undefined) cascade.opacity = scope.defaults.style.opacity;
  if (scope.defaults?.style?.fillOpacity !== undefined) cascade.fillOpacity = scope.defaults.style.fillOpacity;
  if (scope.defaults?.style?.strokeOpacity !== undefined) cascade.strokeOpacity = scope.defaults.style.strokeOpacity;
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
