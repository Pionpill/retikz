import type { IRArrowDetail, IRArrowStyle, IRPathBase } from '../../src';

type PathArrowDirection = 'none' | '->' | '<-' | '<->';

type TestArrowDetail = Record<string, unknown> & {
  start?: Record<string, unknown>;
  end?: Record<string, unknown>;
};

const pathArrow = (detail: TestArrowDetail | undefined, endpoint: 'start' | 'end'): IRArrowStyle => {
  const top = detail ?? {};
  const side = endpoint === 'start' ? top.start : top.end;
  const { start: _start, end: _end, ...topFields } = top;
  void _start;
  void _end;

  return { ...topFields, ...side };
};

/** 按测试方向生成起终点箭头标记，端点专属属性覆盖共享属性 */
export const pathArrows = (
  arrow: PathArrowDirection,
  detail?: IRArrowDetail | TestArrowDetail,
): NonNullable<IRPathBase['arrow']> => {
  if (arrow === 'none') return {};

  const arrows: NonNullable<IRPathBase['arrow']> = {};
  if (arrow === '<-' || arrow === '<->') arrows.start = pathArrow(detail, 'start');
  if (arrow === '->' || arrow === '<->') arrows.end = pathArrow(detail, 'end');

  return arrows;
};
