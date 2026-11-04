import { referencePositionOf, resolveAnchorRefUncached } from '@retikz/core';
import type { CompiledReferenceGeometry, ReferenceReadKind } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

/** 按实际引用能力比较结果；Definition 使用绑定身份，正文及绘制属性不参与连接比较 */
export const compareReferenceGeometry = (
  previous: CompiledReferenceGeometry,
  current: CompiledReferenceGeometry,
  kind: ReferenceReadKind,
): boolean => {
  if (previous === current) return true;
  if (kind === 'position') return jsonStructuralEquals(referencePositionOf(previous), referencePositionOf(current));
  if ('position' in previous || 'position' in current)
    return 'position' in previous && 'position' in current && jsonStructuralEquals(previous.position, current.position);
  if (typeof kind === 'object') {
    // 查询失败或需要诊断时交还正常编译路径，比较本身不发布诊断
    const warnings: Array<true> = [];
    const warn = () => {
      warnings.push(true);
    };
    try {
      const before = resolveAnchorRefUncached(previous, kind.anchor, kind.boundary, undefined, { warn });
      const after = resolveAnchorRefUncached(current, kind.anchor, kind.boundary, undefined, { warn });
      return warnings.length === 0 && jsonStructuralEquals(before, after);
    } catch {
      return false;
    }
  }
  return (
    previous.shape.definition === current.shape.definition &&
    previous.boundary.definition === current.boundary.definition &&
    previous.boundary.isShape === current.boundary.isShape &&
    jsonStructuralEquals(previous.geometry.rect, current.geometry.rect) &&
    jsonStructuralEquals(previous.geometry.margin, current.geometry.margin) &&
    jsonStructuralEquals(previous.shape.params, current.shape.params) &&
    jsonStructuralEquals(previous.boundary.params, current.boundary.params)
  );
};
