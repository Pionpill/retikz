import type { IRArrowDetail, IRArrowEndDetail, IRArrowMark, IRPathBase } from '../../schemas';
import type { StyleFrame } from './frame';

import { cuts, pickDefinedKeys } from './frame';

/** per-field 合并 arrow 端点 spec。 */
const mergeArrowEnd = (
  a: IRArrowEndDetail | undefined,
  b: IRArrowEndDetail | undefined,
): IRArrowEndDetail | undefined => {
  if (a === undefined) return b === undefined ? undefined : { ...b };
  if (b === undefined) return { ...a };
  return { ...a, ...pickDefinedKeys(b) };
};

/** per-field 合并 arrow detail。 */
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

/** 去掉端点 spec 的 color，让端点颜色回退到顶层主色。 */
const dropArrowEndColor = (end: IRArrowEndDetail): IRArrowEndDetail => {
  const next = { ...end };
  delete next.color;
  return next;
};

/** 解析 arrow detail，并让缺省箭头色跟随宿主 path 主色。 */
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

const resolveArrowMark = (
  mark: IRArrowMark,
  { pos, stack, masterColor }: ResolveArrowMarkContext,
): IRArrowMark => {
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

/** 解析 path marks 中的 arrow mark 样式。 */
export const resolvePathMarks = (
  marks: IRPathBase['marks'] | undefined,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRPathBase['marks'] | undefined => {
  if (marks === undefined) return undefined;
  return marks.map(item => ({ ...item, mark: resolveArrowMark(item.mark, { pos: item.pos, stack, masterColor }) }));
};
