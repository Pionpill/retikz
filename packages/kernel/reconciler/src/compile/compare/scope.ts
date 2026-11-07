import type { CanonicalScope, IRAnimationTrack } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

/** 比较有效 Scope 配置，能力绑定按身份比较 */
export const compareCanonicalScopes = (previous: CanonicalScope, current: CanonicalScope): boolean =>
  previous.envelope.shape.definition === current.envelope.shape.definition &&
  previous.clip?.definition === current.clip?.definition &&
  jsonStructuralEquals(previous.envelope.shape.params, current.envelope.shape.params) &&
  previous.envelope.kind === current.envelope.kind &&
  previous.localNamespace === current.localNamespace &&
  jsonStructuralEquals(previous.inheritance, current.inheritance) &&
  jsonStructuralEquals(previous.transform, current.transform) &&
  jsonStructuralEquals(previous.style, current.style) &&
  jsonStructuralEquals(previous.clip?.spec, current.clip?.spec) &&
  jsonStructuralEquals(previous.animations, current.animations);

/** 比较分组收尾后的动画，结果相同时保留已复用的编译产物 */
export const compareScopeAnimations = (previous: Array<IRAnimationTrack>, current: Array<IRAnimationTrack>): boolean =>
  jsonStructuralEquals(previous, current);
