import { referencePositionOf, evaluateAnchorReference } from '@retikz/core';
import type { CompiledReferenceGeometry, ReferenceReadKind } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { NamespaceStack, NamespaceEntry } from '../../compile/runtime';

/** Weave 计算实际消费的名称绑定与几何粒度 */
export type WeaveReferenceRead = Readonly<{
  /** 请求的名称 */
  name: string;
  /** 当时查询到的绑定；未命中时省略 */
  entry?: NamespaceEntry;
  /** 实际读取的几何粒度 */
  kind: ReferenceReadKind;
}>;

/** 在当前查询环境核对已消费的绑定与结果，不把生产者外观变化当作几何失效 */
export const matchWeaveReferences = (
  reads: ReadonlyArray<WeaveReferenceRead>,
  namespace: Pick<NamespaceStack, 'lookupReference'>,
): boolean =>
  reads.every(read => {
    const current = namespace.lookupReference(read.name, read.kind);
    if (current === undefined || read.entry === undefined) return current === read.entry;
    return (
      current.state === read.entry.state &&
      current.producer === read.entry.producer &&
      jsonStructuralEquals(current.irPath, read.entry.irPath) &&
      compareReferenceGeometry(read.entry.geometry, current.geometry, read.kind)
    );
  });

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
      const before = evaluateAnchorReference(previous, kind.anchor, kind.boundary, undefined, { warn });
      const after = evaluateAnchorReference(current, kind.anchor, kind.boundary, undefined, { warn });
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
