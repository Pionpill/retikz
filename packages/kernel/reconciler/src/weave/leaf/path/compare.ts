import type {
  CanonicalPath,
  CanonicalPathStep,
  PathResolution,
  CanonicalPathArrow,
  CanonicalPathMark,
} from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions } from '../../shared';

/** 路径 schema 可重建嵌套字段；普通属性浅比较，几何、标签与扩展参数是显式值边界 */
export const compareCanonicalPaths = (previous: CanonicalPath, current: CanonicalPath, marks = true): boolean => {
  if (previous === current) return true;
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of keys) {
    if (!marks && key === 'marks') continue;
    if (key === 'fill' || key === 'stroke') {
      if (!comparePaintResolutions(previous[key], current[key])) return false;
    } else {
      const left = Reflect.get(previous, key);
      const right = Reflect.get(current, key);
      // schema parse 的几何、标签、标记和扩展 params 可深层重建；其余属性不递归
      if (key === 'children' || key === 'label' || key === 'marks' || key === 'arrow' || key === 'params') {
        if (!jsonStructuralEquals(left, right)) return false;
      } else if (!compareProperties(left, right)) return false;
    }
  }
  return true;
};

/** 几何步骤不包含标签；直接读取字段，避免为每一步分配投影对象 */
export const comparePathStepGeometry = (
  previous: Array<CanonicalPathStep> | undefined,
  current: Array<CanonicalPathStep> | undefined,
): boolean => {
  if (previous === current) return true;
  if (previous === undefined || current === undefined || previous.length !== current.length) return false;
  return previous.every((step, index) => {
    const next = current[index];
    if (step === next) return true;
    for (const key of new Set([...Object.keys(step), ...Object.keys(next)])) {
      if (key !== 'label' && !jsonStructuralEquals(Reflect.get(step, key), Reflect.get(next, key))) return false;
    }
    return true;
  });
};

/** 标记外观只在 params 与 paint 边界深比较，能力必须保持身份 */
export const comparePathMarkContent = (
  previous: CanonicalPathArrow | CanonicalPathMark,
  current: CanonicalPathArrow | CanonicalPathMark,
): boolean => {
  if (previous === current) return true;
  if (previous.definition !== current.definition) return false;
  for (const key of new Set([...Object.keys(previous.mark), ...Object.keys(current.mark)])) {
    if (key === 'fill' || key === 'stroke') {
      if (!comparePaintResolutions(previous.mark[key], current.mark[key])) return false;
    } else if (key === 'params') {
      if (!jsonStructuralEquals(previous.mark.params, current.mark.params)) return false;
    } else if (!compareProperties(Reflect.get(previous.mark, key), Reflect.get(current.mark, key))) return false;
  }
  return true;
};

/** 路径能力绑定及当前完整语义的比较 */
export const comparePathResolutions = (previous: PathResolution, current: PathResolution): boolean =>
  previous === current ||
  (previous.definition === current.definition &&
    compareCanonicalPaths(previous.canon, current.canon) &&
    compareStrokeBindings(previous.stroke, current.stroke));

/** 分开比较端点与 mark 槽位；Map 来自 provider 的声明顺序，不拼接数组或构造空 Map */
export const compareStrokeBindings = (
  previous: PathResolution['stroke'],
  current: PathResolution['stroke'],
  marks = true,
): boolean => {
  if (previous === current) return true;
  if (previous === undefined || current === undefined) return false;
  const compareBindings = (
    left: ReadonlyMap<unknown, CanonicalPathArrow | CanonicalPathMark>,
    right: ReadonlyMap<unknown, CanonicalPathArrow | CanonicalPathMark>,
  ): boolean => {
    if (left === right) return true;
    if (left.size !== right.size) return false;
    const next = right.values();
    for (const binding of left.values()) {
      const other = next.next().value;
      if (
        other === undefined ||
        !comparePathMarkContent(binding, other) ||
        !compareProperties(binding.geometry, other.geometry, { depth: 2 })
      )
        return false;
    }
    return true;
  };
  return compareBindings(previous.arrows, current.arrows) && (!marks || compareBindings(previous.marks, current.marks));
};

/** 保留等价解析结果；canon 与以其声明对象为键的绑定 Map 必须成组复用 */
export const retainPathResolution = (
  previous: PathResolution | null | undefined,
  current: PathResolution,
): PathResolution => {
  if (previous == null || previous === current) return current;
  if (comparePathResolutions(previous, current)) return { ...current, canon: previous.canon, stroke: previous.stroke };
  return {
    ...current,
    canon: {
      ...current.canon,
      // schema 已执行，只有解析后的值等价才保留旧成员；不凭原始 children 身份跳过 transform
      children: jsonStructuralEquals(previous.canon.children, current.canon.children)
        ? previous.canon.children
        : current.canon.children,
      label: jsonStructuralEquals(previous.canon.label, current.canon.label)
        ? previous.canon.label
        : current.canon.label,
    },
  };
};
