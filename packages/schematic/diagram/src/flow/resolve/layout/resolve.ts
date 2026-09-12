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
        rowGap: source.rowGap ?? layout.nodeGap ?? definition.defaults.placementGap.vertical,
        columnGap: source.columnGap ?? layout.nodeGap ?? definition.defaults.placementGap.horizontal,
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
  if (routing.kind === 'straight') return { kind: routing.kind };
  return {
    kind: routing.kind,
    cornerRadius:
      ('cornerRadius' in routing ? routing.cornerRadius : undefined) ??
      (inheritedRouting !== undefined && inheritedRouting.kind !== 'straight'
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
