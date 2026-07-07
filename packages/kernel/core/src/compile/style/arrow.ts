import type { IRArrowDetail, IRArrowEndDetail, IRArrowMark, IRPathBase } from '../../schemas';
import type { StyleFrame } from './frame';

import { cuts, pickDefinedKeys } from './frame';

/** 合并单侧箭头样式：下层只覆盖已声明字段，其余继承上层默认值。 */
const mergeArrowEnd = (
  a: IRArrowEndDetail | undefined,
  b: IRArrowEndDetail | undefined,
): IRArrowEndDetail | undefined => {
  if (a === undefined) return b === undefined ? undefined : { ...b };
  if (b === undefined) return { ...a };
  return { ...a, ...pickDefinedKeys(b) };
};

/** 合并 path 箭头样式：顶层字段与 start / end 端点字段都按继承语义覆盖。 */
const mergeArrowDetail = (a: IRArrowDetail, b: IRArrowDetail): IRArrowDetail => {
  const { start: aStart, end: aEnd, ...aTop } = a;
  const { start: bStart, end: bEnd, ...bTop } = b;
  const out: IRArrowDetail = { ...aTop, ...pickDefinedKeys(bTop) };
  const start = mergeArrowEnd(aStart, bStart);
  if (start !== undefined) out.start = start;
  const end = mergeArrowEnd(aEnd, bEnd);
  if (end !== undefined) out.end = end;
  return out;
};

/** 清除端点专属颜色，让它跟随 path 箭头主色。 */
const dropArrowEndColor = (end: IRArrowEndDetail): IRArrowEndDetail => {
  const next = { ...end };
  delete next.color;
  return next;
};

/** 解析 path 最终箭头样式，合并 scope 默认值、path 主色和显式 arrow 配置。 */
const resolveArrowDetail = (
  explicit: IRArrowDetail | undefined,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRArrowDetail | undefined => {
  let acc: IRArrowDetail = {};
  let touched = false;
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'arrow')) {
      acc = {};
      touched = false;
    }
    if (frame.arrowDefault) {
      acc = mergeArrowDetail(acc, frame.arrowDefault);
      touched = true;
    }
  }
  if (masterColor !== undefined) {
    acc.color = masterColor;
    if (acc.start !== undefined) acc.start = dropArrowEndColor(acc.start);
    if (acc.end !== undefined) acc.end = dropArrowEndColor(acc.end);
    touched = true;
  }
  if (explicit) {
    acc = mergeArrowDetail(acc, explicit);
    touched = true;
  }
  return touched ? acc : undefined;
};

const arrowMarkFromDetail = (detail: IRArrowEndDetail | undefined): Omit<IRArrowMark, 'kind'> => {
  if (detail === undefined) return {};
  return pickDefinedKeys(detail);
};

type ResolveArrowMarkContext = {
  pos: number;
  stack: ReadonlyArray<StyleFrame>;
  masterColor: string | undefined;
};

const resolveArrowMark = (mark: IRArrowMark, { pos, stack, masterColor }: ResolveArrowMarkContext): IRArrowMark => {
  const detail = resolveArrowDetail(undefined, stack, masterColor);
  if (detail === undefined) return mark;
  const { start, end, ...top } = detail;
  const side = pos === 0 ? start : pos === 1 ? end : undefined;
  return {
    kind: 'arrow',
    ...arrowMarkFromDetail(top),
    ...arrowMarkFromDetail(side),
    ...pickDefinedKeys(mark),
  };
};

/** 为 path marks 中的 arrow mark 补齐继承来的箭头样式。 */
export const resolvePathMarks = (
  marks: IRPathBase['marks'] | undefined,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRPathBase['marks'] | undefined => {
  if (marks === undefined) return undefined;
  return marks.map(item => ({ ...item, mark: resolveArrowMark(item.mark, { pos: item.pos, stack, masterColor }) }));
};
