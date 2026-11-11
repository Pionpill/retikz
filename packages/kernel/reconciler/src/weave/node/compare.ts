import type { CanonicalNode } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions } from '../shared';

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

/** 只比较影响节点正文测量与放置的输入，颜色和透明度不触发布局 */
export const compareNodeLayoutInputs = (previous: CanonicalNode, current: CanonicalNode): boolean => {
  if (previous.labels.length !== 0 || current.labels.length !== 0) return false;
  if (
    previous.shape.definition !== current.shape.definition ||
    previous.boundary.definition !== current.boundary.definition
  )
    return false;
  if (
    !jsonStructuralEquals(previous.shape.params, current.shape.params) ||
    !jsonStructuralEquals(previous.boundary.params, current.boundary.params)
  )
    return false;
  if (!jsonStructuralEquals(previous.layout, current.layout)) return false;
  const geometryOfText = (text: CanonicalNode['text']) =>
    text === undefined
      ? undefined
      : {
          font: text.font,
          textAlign: text.textAlign,
          maxTextWidth: text.maxTextWidth,
          lineHeight: text.lineHeight,
          lines: text.lines.map(line => ({
            mixed: line.mixed,
            plainText: line.plainText,
            font: line.style?.font,
            segments: line.segments.map(({ fill, opacity, ...segment }) => {
              void fill;
              void opacity;
              return segment;
            }),
          })),
        };
  return jsonStructuralEquals(geometryOfText(previous.text), geometryOfText(current.text));
};
