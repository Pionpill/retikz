import type { Transform } from '../../contract';
import type { IRPosition } from '../../schemas';
import { projectLayoutWithTransform, projectPublishedCompileLayout } from '../node';
import { applyScopeTransform, applyTransformChain, inverseTransformChain } from '../shared';
import type { ComposedScopeTransform } from '../shared';
import type { ReferenceGeometryContext } from './types';

/** 从实际位置或布局读取中心，不为坐标构造虚拟节点 */
export const referencePositionOf = (geometry: ReferenceGeometryContext): IRPosition =>
  'position' in geometry ? geometry.position : [geometry.geometry.rect.x, geometry.geometry.rect.y];

/** 将引用几何投影到父空间 */
export const projectReferenceGeometry = (
  geometry: ReferenceGeometryContext,
  transform: ComposedScopeTransform,
): ReferenceGeometryContext =>
  'position' in geometry
    ? { position: applyScopeTransform(geometry.position, transform) }
    : projectLayoutWithTransform(geometry, transform);

/** 将已发布的世界空间引用经过当前 Scope 自身变换重新投影 */
export const projectPublishedReference = (
  geometry: ReferenceGeometryContext,
  parentChain: ReadonlyArray<Transform>,
  ownChain: ReadonlyArray<Transform>,
): ReferenceGeometryContext => {
  if (ownChain.length === 0) return geometry;
  if (!('position' in geometry)) return projectPublishedCompileLayout(geometry, parentChain, ownChain);
  const local = inverseTransformChain(geometry.position, parentChain);
  return { position: applyTransformChain(applyTransformChain(local, ownChain), parentChain) };
};
