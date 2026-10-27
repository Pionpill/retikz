import type { Transform } from '../../contract';
import type { IRScope, IRPosition } from '../../schemas';
import type { CompileEnvironment } from '../environment';
import { createSyntheticRectangleLayout } from '../node';
import type { CompiledNodeLayout } from '../node';
import {
  applyTransformChain,
  inverseTransformChain,
  composeScopeTransform,
  projectLayoutWithTransform,
} from '../transform';
import type { CompiledCoordinate, CompiledNode, CompiledScope } from './types';

/** 可提供命名几何的已完成元素，Path 不提供节点定位几何 */
export type CompileReferenceSource =
  | Readonly<{ type: 'node'; compiled: CompiledNode }>
  | Readonly<{ type: 'coordinate'; compiled: CompiledCoordinate }>
  | Readonly<{ type: 'scope'; compiled: CompiledScope }>;

/** 将元素局部状态投影为可登记的引用布局，不修改原编译状态 */
export const projectCompileReference = (
  source: CompileReferenceSource,
  environment: CompileEnvironment,
  parentTransforms: ReadonlyArray<Transform> = [],
): CompiledNodeLayout => {
  if (source.type === 'node') {
    return projectLayoutWithTransform(source.compiled.layout, composeScopeTransform(parentTransforms));
  }
  if (source.type === 'scope') {
    return projectLayoutWithTransform(
      source.compiled.envelope,
      composeScopeTransform([...parentTransforms, ...(source.compiled.group.transforms ?? [])]),
    );
  }
  const [x, y] = source.compiled.position;
  const local = createSyntheticRectangleLayout(
    {
      id: source.compiled.id,
      rect: { x, y, width: 0, height: 0, rotate: 0 },
    },
    environment,
  );
  return projectLayoutWithTransform(local, composeScopeTransform(parentTransforms));
};

/** 按 Core 包络规则向父 Scope 贡献布局；匿名 Scope 透传子布局 */
export const projectScopeCompileLayouts = (
  input: Pick<IRScope, 'id'>,
  envelope: CompiledNodeLayout,
  children: ReadonlyArray<CompiledNodeLayout>,
  transforms: ReadonlyArray<Transform>,
): Array<CompiledNodeLayout> => {
  const transform = composeScopeTransform(transforms);
  return (input.id === undefined ? children : [envelope]).map(layout => projectLayoutWithTransform(layout, transform));
};

/** 将已按 parent ancestor chain 发布的 layout 投影并返回新布局，不修改已发布对象当前 Scope own chain */
export const projectPublishedCompileLayout = (
  layout: CompiledNodeLayout,
  parentChain: ReadonlyArray<Transform>,
  ownChain: ReadonlyArray<Transform>,
): CompiledNodeLayout => {
  if (ownChain.length === 0) return layout;

  const projectAcrossParent = (point: IRPosition): IRPosition => {
    const parentPoint = parentChain.length === 0 ? point : inverseTransformChain(point, parentChain);
    const transformedParent = applyTransformChain(parentPoint, ownChain);
    return parentChain.length === 0 ? transformedParent : applyTransformChain(transformedParent, parentChain);
  };

  const [x, y] = projectAcrossParent([layout.geometry.rect.x, layout.geometry.rect.y]);
  const [contentX, contentY] = projectAcrossParent(layout.geometry.contentCenter);
  let rotateDegrees = 0;
  let scaleX = 1;
  let scaleY = 1;

  for (const transform of ownChain) {
    if (transform.kind === 'rotate') rotateDegrees += transform.degrees;
    if (transform.kind === 'scale') {
      scaleX *= transform.x;
      scaleY *= transform.y ?? transform.x;
    }
  }

  const rect = {
    ...layout.geometry.rect,
    x,
    y,
    rotate: (layout.geometry.rect.rotate ?? 0) + (rotateDegrees * Math.PI) / 180,
    width: layout.geometry.rect.width * Math.abs(scaleX),
    height: layout.geometry.rect.height * Math.abs(scaleY),
  };
  const margin = {
    top: layout.geometry.margin.top * Math.abs(scaleY),
    right: layout.geometry.margin.right * Math.abs(scaleX),
    bottom: layout.geometry.margin.bottom * Math.abs(scaleY),
    left: layout.geometry.margin.left * Math.abs(scaleX),
  };
  return { ...layout, geometry: { ...layout.geometry, rect, margin, contentCenter: [contentX, contentY] } };
};
