import type { CanonicalScope } from '@retikz/core';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import { compareReferenceGeometry } from '../../shared';
import type { WeaveScopeState } from '../../shared';

/** 继承来自父级和局部默认合并；只比较默认通道及主题字段，不深扫整个继承树 */
const compareInheritance = (previous: CanonicalScope['inheritance'], current: CanonicalScope['inheritance']): boolean =>
  compareProperties(previous, current) ||
  (compareProperties(previous.defaults, current.defaults) &&
    previous.theme.name === current.theme.name &&
    previous.theme.mode === current.theme.mode &&
    compareProperties(previous.theme.colors.semantic, current.theme.colors.semantic) &&
    compareProperties(previous.theme.colors.categorical, current.theme.colors.categorical));

/** 变换内可能含嵌套目标表达式；域内值比较用于消除显式默认值与省略值的差异 */
const compareTransform = (previous: CanonicalScope['transform'], current: CanonicalScope['transform']): boolean =>
  compareProperties(previous, current) ||
  (jsonStructuralEquals(previous.position, current.position) &&
    jsonStructuralEquals(previous.transforms, current.transforms));

/** 只比较 Scope 自身编译属性；继承配置由子项消费，子几何在编译上下文中核对 */
export const compareScopeCompileProperties = (previous: CanonicalScope, current: CanonicalScope): boolean =>
  previous === current ||
  (previous.envelope.shape.definition === current.envelope.shape.definition &&
    jsonStructuralEquals(previous.envelope.shape.params, current.envelope.shape.params) &&
    previous.envelope.kind === current.envelope.kind &&
    previous.localNamespace === current.localNamespace &&
    compareTransform(previous.transform, current.transform) &&
    compareProperties(previous.style, current.style) &&
    compareProperties(previous.animations, current.animations) &&
    previous.clip?.definition === current.clip?.definition &&
    jsonStructuralEquals(previous.clip?.spec, current.clip?.spec) &&
    jsonStructuralEquals(previous.clip?.params, current.clip?.params));

/** 批内 preparation 与数组外壳可重建；按点、数值变换链和实际子几何比较 */
export const compareScopeCompileInputs = (
  previous: NonNullable<WeaveScopeState['compile']>['context'],
  current: NonNullable<WeaveScopeState['compile']>['context'],
): boolean =>
  previous === current ||
  (previous.childCount === current.childCount &&
    jsonStructuralEquals(previous.preparation.positionTarget, current.preparation.positionTarget) &&
    jsonStructuralEquals(previous.preparation.preliminaryTransforms, current.preparation.preliminaryTransforms) &&
    jsonStructuralEquals(previous.scopeChain, current.scopeChain) &&
    (previous.layouts === current.layouts ||
      (previous.layouts.length === current.layouts.length &&
        previous.layouts.every((layout, index) =>
          compareReferenceGeometry(layout, current.layouts[index], 'boundary'),
        ))) &&
    // clip 产物包含递归组合及路径命令；只在裁剪边界保留结构比较
    jsonStructuralEquals(previous.preResolvedClipPath, current.preResolvedClipPath));

/** 仅保留不可变领域值，clip.resolve 保持本轮上下文，不复用旧闭包 */
export const retainCanonicalScope = (
  previous: CanonicalScope | null | undefined,
  current: CanonicalScope,
): CanonicalScope => {
  if (previous == null || previous === current) return current;
  return {
    ...current,
    inheritance: compareInheritance(previous.inheritance, current.inheritance)
      ? previous.inheritance
      : current.inheritance,
    transform: compareTransform(previous.transform, current.transform) ? previous.transform : current.transform,
    style: compareProperties(previous.style, current.style) ? previous.style : current.style,
    animations: compareProperties(previous.animations, current.animations) ? previous.animations : current.animations,
    envelope:
      previous.envelope.kind === current.envelope.kind &&
      previous.envelope.shape.definition === current.envelope.shape.definition &&
      jsonStructuralEquals(previous.envelope.shape.params, current.envelope.shape.params)
        ? previous.envelope
        : current.envelope,
  };
};
