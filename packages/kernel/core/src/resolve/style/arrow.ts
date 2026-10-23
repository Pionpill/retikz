import { mergeProperties } from '@retikz/foundation';

import type { IRArrowDetail, IRArrowStyle, IRArrowMark, IRPathBase } from '../../schemas';
import type { EffectiveScopeDefaults } from './types';

/** 合并单侧箭头样式：下层只覆盖已声明字段，其余继承上层默认值 */
const mergeArrowEnd = (a: IRArrowStyle | undefined, b: IRArrowStyle | undefined): IRArrowStyle | undefined => {
  if (a === undefined) return b === undefined ? undefined : { ...b };
  if (b === undefined) return { ...a };
  return { ...a, ...mergeProperties([b], { shouldOverride: value => value !== undefined }) };
};

/** 合并 path 箭头样式：顶层字段与 start / end 端点字段都按继承语义覆盖 */
export const mergeArrowDefaults = (a: IRArrowDetail, b: IRArrowDetail): IRArrowDetail => {
  const { start: aStart, end: aEnd, ...aTop } = a;
  const { start: bStart, end: bEnd, ...bTop } = b;
  const out: IRArrowDetail = { ...aTop, ...mergeProperties([bTop], { shouldOverride: value => value !== undefined }) };
  const start = mergeArrowEnd(aStart, bStart);
  if (start !== undefined) out.start = start;
  const end = mergeArrowEnd(aEnd, bEnd);
  if (end !== undefined) out.end = end;

  return out;
};

/** 清除端点专属颜色，让它跟随 path 箭头主色 */
const dropArrowEndColor = (end: IRArrowStyle): IRArrowStyle => {
  const next = { ...end };
  delete next.color;
  return next;
};

/** 解析 path 最终箭头样式，合并 scope 默认值、path 主色和显式 arrow 配置 */
const resolveArrowDetail = (
  explicit: IRArrowDetail | undefined,
  scopeDefaults: EffectiveScopeDefaults,
  masterColor: string | undefined,
): IRArrowDetail | undefined => {
  let acc: IRArrowDetail = { ...scopeDefaults.path?.arrow };
  let touched = scopeDefaults.path?.arrow !== undefined;

  if (masterColor !== undefined) {
    acc.color = masterColor;
    if (acc.start !== undefined) acc.start = dropArrowEndColor(acc.start);
    if (acc.end !== undefined) acc.end = dropArrowEndColor(acc.end);
    touched = true;
  }

  if (explicit) {
    acc = mergeArrowDefaults(acc, explicit);
    touched = true;
  }

  return touched ? acc : undefined;
};

const arrowMarkFromDetail = (detail: IRArrowStyle | undefined): Omit<IRArrowMark, 'kind'> => {
  if (detail === undefined) return {};
  return mergeProperties([detail], { shouldOverride: value => value !== undefined });
};

type ResolveArrowMarkContext = {
  pos: number;
  scopeDefaults: EffectiveScopeDefaults;
  masterColor: string | undefined;
};

const resolveArrowMark = (
  mark: IRArrowMark,
  { pos, scopeDefaults, masterColor }: ResolveArrowMarkContext,
): IRArrowMark => {
  const detail = resolveArrowDetail(undefined, scopeDefaults, masterColor);
  if (detail === undefined) return mark;

  const { start, end, ...top } = detail;
  const side = pos === 0 ? start : pos === 1 ? end : undefined;

  return {
    kind: 'arrow',
    ...arrowMarkFromDetail(top),
    ...arrowMarkFromDetail(side),
    ...mergeProperties([mark], { shouldOverride: value => value !== undefined }),
  };
};

/** 为 path marks 中的 arrow mark 补齐继承而来的箭头样式 */
export const resolvePathMarks = (
  marks: IRPathBase['marks'] | undefined,
  scopeDefaults: EffectiveScopeDefaults,
  masterColor: string | undefined,
): IRPathBase['marks'] | undefined => {
  if (marks === undefined) return undefined;
  return marks.map(item => ({
    ...item,
    mark: resolveArrowMark(item.mark, { pos: item.pos, scopeDefaults, masterColor }),
  }));
};
