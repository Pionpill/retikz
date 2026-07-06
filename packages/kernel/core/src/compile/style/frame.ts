import type { IRDrawableStyle, IRLabelDefault, IRScope, StyleChannel } from '../../schemas';

/** scope 级联 graphic state。 */
export type CascadeState = Pick<
  IRScope,
  'color' | 'stroke' | 'fill' | 'strokeWidth' | 'opacity' | 'fillOpacity' | 'strokeOpacity'
>;

/** 单层 scope 样式 frame。 */
export type StyleFrame = {
  /** 级联 graphic state。 */
  cascade: CascadeState;
  /** node 样式通道。 */
  nodeDefault?: IRScope['nodeDefault'];
  /** path 样式通道。 */
  pathDefault?: IRScope['pathDefault'];
  /** label 样式通道。 */
  labelDefault?: IRLabelDefault;
  /** arrow 样式通道。 */
  arrowDefault?: IRScope['arrowDefault'];
  /** 继承屏障。 */
  resetStyle?: IRScope['resetStyle'];
};

/** 拷贝源对象中 !== undefined 的字段。 */
export const pickDefinedKeys = <T extends object>(src: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const key of Object.keys(src) as Array<keyof T>) {
    const value = src[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
};

const DRAWABLE_STYLE_KEYS = [
  'color',
  'fill',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'strokeOpacity',
  'opacity',
  'shadow',
  'blendMode',
] as const satisfies ReadonlyArray<keyof IRDrawableStyle>;

/** 提取 drawable style 字段。 */
export const pickDrawableStyle = (src: Partial<IRDrawableStyle>): Partial<IRDrawableStyle> => {
  const entries = DRAWABLE_STYLE_KEYS.flatMap(key => {
    const value = src[key];
    return value === undefined ? [] : ([[key, value]] as const);
  });
  return Object.fromEntries(entries);
};

/** 从 IRScope 抽取样式 frame。 */
export const createStyleFrame = (scope: IRScope): StyleFrame => {
  const cascade: CascadeState = {};
  if (scope.color !== undefined) cascade.color = scope.color;
  if (scope.stroke !== undefined) cascade.stroke = scope.stroke;
  if (scope.fill !== undefined) cascade.fill = scope.fill;
  if (scope.strokeWidth !== undefined) cascade.strokeWidth = scope.strokeWidth;
  if (scope.opacity !== undefined) cascade.opacity = scope.opacity;
  if (scope.fillOpacity !== undefined) cascade.fillOpacity = scope.fillOpacity;
  if (scope.strokeOpacity !== undefined) cascade.strokeOpacity = scope.strokeOpacity;
  const frame: StyleFrame = { cascade };
  if (scope.nodeDefault) frame.nodeDefault = scope.nodeDefault;
  if (scope.pathDefault) frame.pathDefault = scope.pathDefault;
  if (scope.labelDefault) frame.labelDefault = scope.labelDefault;
  if (scope.arrowDefault) frame.arrowDefault = scope.arrowDefault;
  if (scope.resetStyle !== undefined) frame.resetStyle = scope.resetStyle;
  return frame;
};

/** resetStyle 是否切断某通道。 */
export const cuts = (reset: StyleFrame['resetStyle'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  if (reset === true) return true;
  return reset.includes(channel);
};
