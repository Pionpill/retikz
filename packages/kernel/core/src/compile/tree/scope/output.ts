import { boundsToRect } from '@retikz/math';

import type { GroupPrimitive, ScenePrimitive, SceneResource, Transform } from '../../../contract';
import { resolveAnimations } from '../../../resolve';
import type { AnimationResolveContext } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { LayoutBoundsContribution } from '../../layout';
import { collectLayoutBounds, calculateBoundsOfPrimitives, allocationPointsOf } from '../../scene';
import { applyTransformChain } from '../../shared';
import type { CompileBounds } from '../../shared';

/** 判断 Scope 是否需要保留可见分组，空匿名分组可被裁去 */
export const shouldEmitScopeGroup = (
  childCount: number,
  transforms: ReadonlyArray<Transform>,
  id: string | undefined,
  hasClip: boolean,
): boolean => childCount > 0 || transforms.length > 0 || id !== undefined || hasClip;

/** 在真实子输出就绪后裁空、解析动画并生成分组 */
export const emitScopePrimitive = (
  group: Omit<GroupPrimitive, 'children' | 'animations'>,
  children: Array<ScenePrimitive>,
  input: Pick<IRScope, 'animations'>,
  context: Pick<AnimationResolveContext, 'onWarn' | 'irPath'>,
): GroupPrimitive | undefined => {
  if (!shouldEmitScopeGroup(children.length, group.transforms ?? [], group.id, group.clipRef !== undefined)) return;
  const animations = resolveAnimations(input.animations, { ...context, target: 'element' });
  return { ...group, ...(animations === undefined ? {} : { animations }), children };
};

/** 投影子输出边界；装饰经过裁剪，布局贡献只应用变换 */
export const projectScopeOutputBounds = (
  bounds: ReadonlyArray<CompileBounds>,
  group: Omit<GroupPrimitive, 'children'>,
  resources: ReadonlyArray<SceneResource>,
): Array<LayoutBoundsContribution> => {
  const projectedBounds: Array<LayoutBoundsContribution> = [];
  for (const contribution of bounds) {
    if (contribution.decoration) {
      const box = collectLayoutBounds(undefined, contribution.boundsPoints);
      if (box === undefined) continue;
      const projected = calculateBoundsOfPrimitives(
        [{ ...group, children: [{ type: 'rect', ...boundsToRect(box), fill: 'black' }] }],
        resources,
      );
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
