import { BendOutAngleSchema, BendInAngleSchema, BendLoosenessSchema, SmoothTensionSchema } from '@retikz/core';

import type {
  EffectiveFlowLayout,
  EffectiveFlowPlacement,
  FlowLayoutDefinition,
  FlowLayoutRouting,
} from '../../contract';
import type { IRFlowLayout, IRFlowLayoutIntent, IRFlowRouting } from '../../schemas';

/** 作者间距优先于固定排列的物理轴默认值；不继承自动布局补出的默认间距 */
export const resolveEffectiveFlowPlacement = (
  source: IRFlowLayout,
  layout: IRFlowLayoutIntent,
  definition: FlowLayoutDefinition,
): EffectiveFlowPlacement =>
  source.kind === 'linear'
    ? {
        kind: source.kind,
        direction: source.direction,
        gap:
          source.gap ??
          layout.nodeGap ??
          (source.direction === 'left' || source.direction === 'right'
            ? definition.defaults.placementGap.horizontal
            : definition.defaults.placementGap.vertical),
        align: source.align ?? 'center',
        ...(source.excludeFromBounds === undefined ? {} : { excludeFromBounds: source.excludeFromBounds }),
      }
    : {
        kind: source.kind,
        gap: {
          row:
            (typeof source.gap === 'number' ? source.gap : source.gap?.row) ??
            layout.nodeGap ??
            definition.defaults.placementGap.vertical,
          column:
            (typeof source.gap === 'number' ? source.gap : source.gap?.column) ??
            layout.nodeGap ??
            definition.defaults.placementGap.horizontal,
        },
        reserveLabelSpace: source.reserveLabelSpace ?? true,
        placements: source.placements,
        ...(source.excludeFromBounds === undefined ? {} : { excludeFromBounds: source.excludeFromBounds }),
      };

const resolveFlowLayoutRouting = (
  definition: FlowLayoutDefinition,
  intent: IRFlowRouting | undefined,
  inheritedRouting: FlowLayoutRouting | undefined,
): FlowLayoutRouting => {
  const routing = intent ?? inheritedRouting ?? definition.defaults.routing;
  if (routing.kind === 'smooth')
    return { ...routing, tension: routing.tension ?? SmoothTensionSchema.parse(undefined) };
  if (routing.kind === 'curve' || routing.kind === 'cubic') return routing;
  if (routing.kind === 'straight') return { kind: routing.kind };
  if (routing.kind === 'bend') {
    const authored = intent?.kind === 'bend' ? intent : undefined;
    const ancestor = inheritedRouting?.kind === 'bend' ? inheritedRouting : undefined;
    const localTangents = authored?.outAngle !== undefined || authored?.inAngle !== undefined;
    const localSymmetric =
      !localTangents && (authored?.bendDirection !== undefined || authored?.bendAngle !== undefined);
    const inheritedTangents = ancestor !== undefined && 'outAngle' in ancestor ? ancestor : undefined;
    if (localTangents || (!localSymmetric && inheritedTangents !== undefined)) {
      return {
        kind: 'bend',
        outAngle: authored?.outAngle ?? inheritedTangents?.outAngle ?? BendOutAngleSchema.parse(undefined),
        inAngle: authored?.inAngle ?? inheritedTangents?.inAngle ?? BendInAngleSchema.parse(undefined),
        looseness: authored?.looseness ?? inheritedTangents?.looseness ?? BendLoosenessSchema.parse(undefined),
      };
    }
    const inheritedSymmetric = ancestor !== undefined && !('outAngle' in ancestor) ? ancestor : undefined;
    const bendDirection = authored?.bendDirection ?? inheritedSymmetric?.bendDirection;
    const bendAngle = authored?.bendAngle ?? inheritedSymmetric?.bendAngle;
    return {
      kind: 'bend',
      ...(bendAngle === undefined ? {} : { bendAngle }),
      ...(bendDirection === undefined ? {} : { bendDirection }),
    };
  }
  const turnPosition =
    routing.kind === 'orthogonal'
      ? (('turnPosition' in routing ? routing.turnPosition : undefined) ??
        (inheritedRouting?.kind === 'orthogonal' ? inheritedRouting.turnPosition : undefined))
      : undefined;
  return {
    kind: routing.kind,
    ...(turnPosition === undefined ? {} : { turnPosition }),
    cornerRadius:
      ('cornerRadius' in routing ? routing.cornerRadius : undefined) ??
      (inheritedRouting !== undefined && 'cornerRadius' in inheritedRouting
        ? inheritedRouting.cornerRadius
        : undefined) ??
      definition.defaults.routing.orthogonalCornerRadius ??
      0,
  };
};

/** 把 Definition 默认、继承值与稀疏 Flow intent 确定为完整布局配置 */
export const resolveEffectiveFlowLayout = (
  definition: FlowLayoutDefinition,
  intent: IRFlowLayoutIntent,
  inheritedLayout?: EffectiveFlowLayout,
  routing?: IRFlowRouting,
): EffectiveFlowLayout => ({
  direction: intent.direction ?? inheritedLayout?.direction ?? definition.defaults.direction,
  nodeGap: intent.nodeGap ?? inheritedLayout?.nodeGap ?? definition.defaults.nodeGap,
  rankGap: intent.rankGap ?? inheritedLayout?.rankGap ?? definition.defaults.rankGap,
  routing: resolveFlowLayoutRouting(definition, routing, inheritedLayout?.routing),
});
