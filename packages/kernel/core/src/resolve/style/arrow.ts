import { mergeDefinedProperties } from '@retikz/foundation';

import type { IRArrowDetail, IRMarkStyle, IRPathArrowEnd, IRPathBase } from '../../schemas';
import type { EffectiveScopeDefaults } from './types';

/** 合并单侧箭头样式：下层只覆盖已声明字段，其余继承上层默认值 */
const mergeArrowEnd = (
  parent: IRPathArrowEnd | undefined,
  own: IRPathArrowEnd | undefined,
): IRPathArrowEnd | undefined => {
  if (parent === undefined && own === undefined) return undefined;
  return mergeDefinedProperties([parent, own]);
};

/** 合并路径箭头默认值：own 中非 undefined 的字段覆盖 parent，start / end 各自逐字段合并 */
export const mergeArrowDefaults = (parent: IRArrowDetail, own: IRArrowDetail): IRArrowDetail => {
  const { start: parentStart, end: parentEnd, ...parentStyle } = parent;
  const { start: ownStart, end: ownEnd, ...ownStyle } = own;
  const out: IRArrowDetail = mergeDefinedProperties([parentStyle, ownStyle]);
  const start = mergeArrowEnd(parentStart, ownStart);
  if (start !== undefined) out.start = start;
  const end = mergeArrowEnd(parentEnd, ownEnd);
  if (end !== undefined) out.end = end;

  return out;
};

/** 标记外观继承所需的端点位置、默认配置与路径主色 */
type ResolveMarkAppearanceContext = {
  /** 箭头所在端点；沿线标记省略此字段 */
  endpoint?: 'start' | 'end';
  /** 当前作用域的有效默认配置 */
  scopeDefaults: EffectiveScopeDefaults;
  /** 路径主色，提供时覆盖标记主色 */
  masterColor: string | undefined;
};

/** 合并共用、端点和标记自身的外观；提供路径主色时以该色覆盖标记主色 */
const resolveMarkAppearance = (
  mark: IRMarkStyle,
  { endpoint, scopeDefaults, masterColor }: ResolveMarkAppearanceContext,
): IRMarkStyle => {
  const detail = scopeDefaults.path?.arrow;
  if (detail === undefined) return masterColor === undefined ? mark : { ...mark, color: masterColor };

  const { start, end, ...top } = detail;
  const side = endpoint === 'start' ? start : endpoint === 'end' ? end : undefined;

  return {
    ...top,
    ...side,
    ...mergeDefinedProperties([mark]),
    ...(masterColor === undefined ? {} : { color: masterColor }),
  };
};

/** 为已有沿线标记补齐箭头共用外观，并应用路径主色 */
export const resolvePathMarks = (
  marks: IRPathBase['marks'] | undefined,
  scopeDefaults: EffectiveScopeDefaults,
  masterColor: string | undefined,
): IRPathBase['marks'] | undefined => {
  if (marks === undefined) return undefined;
  return marks.map(item => ({
    ...resolveMarkAppearance(item, { scopeDefaults, masterColor }),
    pos: item.pos,
    rotate: item.rotate,
  }));
};

/** 为显式存在的端点箭头应用对应默认，不创建缺省端点 */
export const resolvePathArrows = (
  arrow: IRPathBase['arrow'],
  scopeDefaults: EffectiveScopeDefaults,
  masterColor: string | undefined,
): IRPathBase['arrow'] => {
  if (arrow === undefined) return undefined;
  const result: NonNullable<IRPathBase['arrow']> = {};
  for (const endpoint of ['start', 'end'] as const) {
    const source = arrow[endpoint];
    if (source === undefined) continue;
    const style = resolveMarkAppearance(source, { endpoint, scopeDefaults, masterColor });
    result[endpoint] = {
      ...style,
      endpointOverlap: source.endpointOverlap ?? scopeDefaults.path?.arrow?.[endpoint]?.endpointOverlap,
    };
  }
  return result;
};
