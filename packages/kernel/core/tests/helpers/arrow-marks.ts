import type { IRArrowDetail, IRArrowMark, IRPathBase } from '../../src';

type PathArrowDirectionValue = 'none' | '->' | '<-' | '<->';
type TestArrowDetail = Record<string, unknown> & {
  start?: Record<string, unknown>;
  end?: Record<string, unknown>;
};

const arrowMark = (detail: TestArrowDetail | undefined, endpoint: 'start' | 'end'): IRArrowMark => {
  const top = detail ?? {};
  const side = endpoint === 'start' ? top.start : top.end;
  const { start: _start, end: _end, ...topFields } = top;
  void _start;
  void _end;
  return { kind: 'arrow', ...topFields, ...side };
};

export const arrowMarks = (
  arrow: PathArrowDirectionValue,
  detail?: IRArrowDetail | TestArrowDetail,
): NonNullable<IRPathBase['marks']> => {
  if (arrow === 'none') return [];
  const marks: NonNullable<IRPathBase['marks']> = [];
  if (arrow === '<-' || arrow === '<->') marks.push({ pos: 0, mark: arrowMark(detail, 'start') });
  if (arrow === '->' || arrow === '<->') marks.push({ pos: 1, mark: arrowMark(detail, 'end') });
  return marks;
};
