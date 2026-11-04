import type { CanonicalNode } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions } from './paint';

/** 比较节点的有效语义，能力绑定按身份参与失效判断 */
export const compareCanonicalNodes = (previous: CanonicalNode, current: CanonicalNode): boolean => {
  if (previous === current) return true;
  return (
    previous.shape.definition === current.shape.definition &&
    previous.boundary.definition === current.boundary.definition &&
    previous.boundary.isShape === current.boundary.isShape &&
    jsonStructuralEquals(previous.shape.params, current.shape.params) &&
    jsonStructuralEquals(previous.boundary.params, current.boundary.params) &&
    comparePaintResolutions(previous.style.fill, current.style.fill) &&
    comparePaintResolutions(previous.style.stroke, current.style.stroke) &&
    jsonStructuralEquals(previous.layout, current.layout) &&
    jsonStructuralEquals(previous.style, current.style) &&
    jsonStructuralEquals(previous.text, current.text) &&
    jsonStructuralEquals(previous.labels, current.labels) &&
    jsonStructuralEquals(previous.animations, current.animations) &&
    previous.id === current.id &&
    previous.zIndex === current.zIndex &&
    jsonStructuralEquals(previous.aliasIds, current.aliasIds) &&
    jsonStructuralEquals(previous.meta, current.meta)
  );
};
