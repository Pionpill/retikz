import type { EffectiveFlowLayout, FlowLayoutDefinition, FlowLayoutRouting } from '../../contract';
import type { IRFlowLayoutIntent, IRFlowRouting } from '../../schemas';

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
