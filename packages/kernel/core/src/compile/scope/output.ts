import { boundsToRect } from '@retikz/math';

import type { GroupPrimitive, SceneResources, Transform } from '../../contract';
import type { IRScope } from '../../schemas';
import type { CompiledBoundaryGeometry } from '../boundary';
import type { CompiledReferenceGeometry } from '../reference';
import { projectReferenceGeometry } from '../reference';
import { mergeLayoutBounds, createGroupBoundsProjector, allocationPointsOf } from '../scene';
import type { CompileBounds, LayoutBoundsContribution } from '../scene';
import { applyTransformChain, composeScopeTransform } from '../shared';

/** 投影子输出边界；装饰经过裁剪，布局贡献只应用变换 */
export const projectScopeOutputBounds = (
  bounds: ReadonlyArray<CompileBounds>,
  group: Omit<GroupPrimitive, 'children'>,
  resources: SceneResources,
): Array<LayoutBoundsContribution> => {
  const projectedBounds: Array<LayoutBoundsContribution> = [];
  let projectDecoration: ReturnType<typeof createGroupBoundsProjector> | undefined;
  for (const contribution of bounds) {
    if (contribution.decoration) {
      const box = mergeLayoutBounds(undefined, contribution.boundsPoints);
      if (box === undefined) continue;
      projectDecoration ??= createGroupBoundsProjector(group, resources);
      const projected = projectDecoration(boundsToRect(box));
      if (projected !== undefined)
        projectedBounds.push({ decoration: true, boundsPoints: allocationPointsOf(projected) });
    } else {
      projectedBounds.push({
        shadow: contribution.shadow,
        boundsPoints: contribution.boundsPoints.map(point => applyTransformChain(point, group.transforms ?? [])),
      });
    }
  }
  return projectedBounds;
};

/** 按 Core 包络规则向父 Scope 贡献布局；匿名 Scope 透传子布局 */
export const projectScopeCompileLayouts = (
  input: Pick<IRScope, 'id'>,
  envelope: CompiledBoundaryGeometry,
  children: ReadonlyArray<CompiledReferenceGeometry>,
  transforms: ReadonlyArray<Transform>,
): Array<CompiledReferenceGeometry> => {
  const transform = composeScopeTransform(transforms);
  return (input.id === undefined ? children : [envelope]).map(layout => projectReferenceGeometry(layout, transform));
};
