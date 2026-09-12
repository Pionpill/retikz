import type {
  EffectiveFlowLayout,
  EffectiveFlowPlacement,
  FlowLayoutDefinition,
  FlowLayoutRouting,
} from '../../contract';
import type { IRFlowLayout, IRFlowLayoutIntent, IRFlowRouting } from '../../schemas';

/** 将作者固定排列配置与当前 scope 的有效间距合并 */
export const resolveEffectiveFlowPlacement = (
  source: IRFlowLayout,
  layout: EffectiveFlowLayout,
): EffectiveFlowPlacement =>
  source.kind === 'linear'
    ? {
        kind: source.kind,
        direction: source.direction,
        gap: source.gap ?? layout.nodeGap,
        align: source.align ?? 'center',
      }
    : {
        kind: source.kind,
        rowGap: source.rowGap ?? layout.nodeGap,
        columnGap: source.columnGap ?? layout.nodeGap,
        reserveLabelSpace: source.reserveLabelSpace ?? true,
        placements: source.placements,
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
      (inheritedRouting?.kind === 'orthogonal' ? inheritedRouting.cornerRadius : undefined) ??
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
