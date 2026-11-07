import type { PathResolution } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions } from './paint';

/** 路径能力绑定及当前完整语义的比较 */
export const comparePathResolutions = (previous: PathResolution, current: PathResolution): boolean =>
  previous.definition === current.definition &&
  comparePaintResolutions(previous.canon.fill, current.canon.fill) &&
  comparePaintResolutions(previous.canon.stroke, current.canon.stroke) &&
  jsonStructuralEquals(previous.canon, current.canon) &&
  compareStrokeBindings(previous.stroke, current.stroke);

/** 比较已选用的标记能力与确定化参数，Map 的声明对象身份不参与语义比较 */
const compareStrokeBindings = (previous: PathResolution['stroke'], current: PathResolution['stroke']): boolean => {
  if (previous === undefined || current === undefined) return previous === current;
  const oldMarks = [...previous.arrows.values(), ...previous.marks.values()];
  const newMarks = [...current.arrows.values(), ...current.marks.values()];
  return (
    oldMarks.length === newMarks.length &&
    oldMarks.every((mark, index) => {
      const next = newMarks[index];
      return (
        mark.definition === next.definition &&
        comparePaintResolutions(mark.mark.fill, next.mark.fill) &&
        comparePaintResolutions(mark.mark.stroke, next.mark.stroke) &&
        jsonStructuralEquals(mark.mark, next.mark) &&
        jsonStructuralEquals(mark.geometry, next.geometry)
      );
    })
  );
};
