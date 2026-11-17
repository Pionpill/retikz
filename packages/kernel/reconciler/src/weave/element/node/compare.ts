import type { CanonicalNode, CanonicalNodeLayout, CanonicalNodeStyle } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { comparePaintResolutions, compareTextBlocks } from '../../shared';

/** 布局由 resolve 重建；数值边距浅比较，嵌套位置表达式保留领域值比较 */
const compareLayout = (previous: CanonicalNodeLayout, current: CanonicalNodeLayout, position = true): boolean =>
  previous === current ||
  (previous.rotate === current.rotate &&
    previous.width === current.width &&
    compareProperties(previous.padding, current.padding) &&
    compareProperties(previous.margin, current.margin) &&
    compareProperties(previous.minimumSize, current.minimumSize) &&
    (!position || jsonStructuralEquals(previous.position, current.position)));

/** 绘制默认值在 resolve 中展开；只对 paint 资源使用能力绑定比较 */
const compareStyle = (previous: CanonicalNodeStyle, current: CanonicalNodeStyle): boolean => {
  if (compareProperties(previous, current)) return true;
  return (
    (Object.keys(previous) as Array<keyof CanonicalNodeStyle>).every(key =>
      key === 'fill' || key === 'stroke'
        ? comparePaintResolutions(previous[key], current[key])
        : compareProperties(previous[key], current[key]),
    ) && Object.keys(previous).length === Object.keys(current).length
  );
};

/** 比较正文与形状测量条件；位置不参与测量，旋转和边距仍可能改变 allocation 宽度 */
export const compareNodeMeasurementInputs = (previous: CanonicalNode, current: CanonicalNode): boolean =>
  previous === current ||
  (previous.shape.definition === current.shape.definition &&
    // 扩展 schema 可产生嵌套参数；只在这一不透明参数边界保留值比较
    jsonStructuralEquals(previous.shape.params, current.shape.params) &&
    compareLayout(previous.layout, current.layout, false) &&
    compareTextBlocks(previous.text, current.text));

/** 比较节点属性；文本、位置、扩展参数和标签分别按其领域语义比较 */
export const compareCanonicalNodes = (previous: CanonicalNode, current: CanonicalNode): boolean =>
  compareProperties(previous, current) ||
  (previous.shape.definition === current.shape.definition &&
    previous.boundary.definition === current.boundary.definition &&
    previous.boundary.isShape === current.boundary.isShape &&
    jsonStructuralEquals(previous.shape.params, current.shape.params) &&
    jsonStructuralEquals(previous.boundary.params, current.boundary.params) &&
    compareLayout(previous.layout, current.layout) &&
    compareStyle(previous.style, current.style) &&
    compareTextBlocks(previous.text, current.text) &&
    // 标签包含位置与 pin paint；独立于正文测量，不能仅凭作者 text 引用复用
    jsonStructuralEquals(previous.labels, current.labels) &&
    compareProperties(previous.animations, current.animations) &&
    previous.id === current.id &&
    previous.zIndex === current.zIndex &&
    compareProperties(previous.aliasIds, current.aliasIds) &&
    compareProperties(previous.meta, current.meta));

/** 只比较影响节点正文测量与放置的输入，颜色和透明度不触发布局 */
export const compareNodeLayoutInputs = (previous: CanonicalNode, current: CanonicalNode): boolean => {
  if (previous === current) return true;
  if (previous.labels.length !== 0 || current.labels.length !== 0) return false;
  return (
    previous.shape.definition === current.shape.definition &&
    previous.boundary.definition === current.boundary.definition &&
    jsonStructuralEquals(previous.shape.params, current.shape.params) &&
    jsonStructuralEquals(previous.boundary.params, current.boundary.params) &&
    compareLayout(previous.layout, current.layout) &&
    compareTextBlocks(previous.text, current.text, false)
  );
};

/** 在候选状态中保留已确认等价的子产物；Core 不持有历史，也不修改旧 canon */
export const retainCanonicalNode = (
  previous: CanonicalNode | null | undefined,
  current: CanonicalNode,
): CanonicalNode => {
  if (previous == null || previous === current) return current;
  return {
    ...current,
    text: compareTextBlocks(previous.text, current.text) ? previous.text : current.text,
    layout: compareLayout(previous.layout, current.layout) ? previous.layout : current.layout,
    style: compareStyle(previous.style, current.style) ? previous.style : current.style,
    shape:
      previous.shape.definition === current.shape.definition &&
      jsonStructuralEquals(previous.shape.params, current.shape.params)
        ? previous.shape
        : current.shape,
    boundary:
      previous.boundary.definition === current.boundary.definition &&
      previous.boundary.isShape === current.boundary.isShape &&
      jsonStructuralEquals(previous.boundary.params, current.boundary.params)
        ? previous.boundary
        : current.boundary,
    labels: jsonStructuralEquals(previous.labels, current.labels) ? previous.labels : current.labels,
    animations: compareProperties(previous.animations, current.animations) ? previous.animations : current.animations,
    aliasIds: compareProperties(previous.aliasIds, current.aliasIds) ? previous.aliasIds : current.aliasIds,
    meta: compareProperties(previous.meta, current.meta) ? previous.meta : current.meta,
  };
};
